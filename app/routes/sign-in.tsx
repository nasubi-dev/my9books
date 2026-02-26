import type { JSX } from 'react'
import { SignIn } from '@clerk/react-router'

export default function SignInPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
