import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { StyledString } from 'next/dist/build/swc';
import { useRouter } from 'next/navigation';
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link';
import { createLinkToken } from '@/lib/actions/user.actions';

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();

  const [token, setToken] = useState('');

  useEffect(() => {
    const getLinkToken = async () => {
      const data = await createLinkToken(user);

      setToken(data?.linkToken)
    };

    getLinkToken();
  }, [user]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    // await exchangePublicToken({
    //   public_token: public_token,
    //   user,
    // });

    router.push('/');
  }, [user]);



  const config: PlaidLinkOptions = {
    token,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  return (
    <>
      {variant === 'primary' ? (
        <Button
          className='plaidlink-primary'
          onClick={() => open()}
          disabled={!ready}
        >
          Connect a bank
        </Button>
      ) : variant === 'ghost' ? (
        <Button
          className='plaidlink-ghost'
          onClick={() => {
            console.log('Plaid Link Clicked')
          }}
        >
          Connect a bank
        </Button>
      ) : (
        <Button
          className='plaidlink-default'
          onClick={() => {
            console.log('Plaid Link Clicked')
          }}
        >
          Connect a bank
        </Button>
      )}
    </>
  )
}

export default PlaidLink