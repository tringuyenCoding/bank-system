'use server';

import { cookies } from "next/headers";
import { createAdminClient, createSessionClient } from "../appwrite";
import { ID } from "node-appwrite";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { Processor } from "postcss";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const { APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID , APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID } = process.env;

export const signIn = async({email, password}: signInProps) => {
  // Sign in user
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    return parseStringify(session);
  } catch (error) {
    // Do something
  }
}

export const signUp = async (userData: SignUpParams) => {
  const {email, password, firstName, lastName} = userData;

  let newUserAccount;

  try {
    // Create a user account
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(),
      email, 
      password, 
      `${firstName} ${lastName}`
    );
    
    if (!newUserAccount) throw new Error('Error creating user account');
    
    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal',
    });

    if (!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer');

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!, 
      USER_COLLECTION_ID!, 
      ID.unique(),
       {
        ...userData,
        dwollaCustomerId,
        dwollaCustomerUrl,
    });

    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.log(error);
  }
}

// ... your initilization functions

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    cookies().delete("appwrite-session");
    await account.deleteSession("current");
  } catch (error) {
    return null;
  }
}


export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user:{
        client_user_id: user.$id,
      },
      client_name: user.name,
      products: ["auth"] as Products[],
      country_codes: ['US'] as CountryCode[],
      language: 'en',
    }
    
    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({linkToken: response.data.link_token});
  }catch(error) {
    console.log(error)
  }
}

export const createBankAccount = async ({accessToken, userId, accountId, bankId, fundingSourceUrl, sharableId}: createBankAccountProps) => {

  try {
    const { database } = await createAdminClient();
    
    const bankAccount = await database.createDocument(DATABASE_ID!,BANK_COLLECTION_ID!, ID.unique(), 
    {
      userId,
      accessToken,
      accountId,
      bankId,
      fundingSourceUrl,
      sharableId,
    });

    return parseStringify(bankAccount);
  } catch (error) {
    console.log(error);
  }
}

export const exchangePublicToken = async ({publicToken, user}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Creat a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      processor: 'dwolla' as ProcessorTokenCreateRequestProcessorEnum,
      access_token: accessToken,
      account_id: accountData.account_id,
    };
    
    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a funding source for Dwolla using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl)  throw Error;
    
    // Create a bank account using the access token, user ID, account ID, bank ID, funding source URL, and sharable ID
    await createBankAccount({
      accessToken,
      userId: user.$id,
      accountId: accountData.account_id,
      bankId: itemId,
      fundingSourceUrl,
      sharableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath('/');

    // Return a success message
    return parseStringify({publicTokenExchange: 'complete'});  
  } catch (error) {
    console.log(error);
  }
}
