'use server';

import { cookies } from "next/headers";
import { createAdminClient, createSessionClient } from "../appwrite";
import { ID } from "node-appwrite";
import { parseStringify } from "../utils";

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
  try {
    // Create a user account
    const { account } = await createAdminClient();

    const {email, password, firstName, lastName} = userData;

    const newUserAccount = await account.create(ID.unique(), email, password, `${firstName} ${lastName}`);
    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUserAccount);
  } catch (error) {
    // Do something
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
