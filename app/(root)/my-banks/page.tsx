import HeaderBox from '@/components/HeaderBox'
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ userId: loggedIn.$id });
  return (
    <section className='flex'>
      <div className='my-banks'>
        <HeaderBox title='Bank Accounts'
          subtext='Effortlessly manage your banking activities' 
          />
        <div className='space-y-4'>
          <h2 className='header-2'>
            Your cards
          </h2>
        </div>
      </div>
    </section>
  )
}

export default MyBanks