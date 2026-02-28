import type { JSX } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import type { Route } from './+types/home'
import { getAuth } from '@clerk/react-router/server'
import { Link, useLoaderData } from 'react-router'
import { COPY } from '../lib/copy'

// ─── Loader ──────────────────────────────────────────────────

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args as unknown as LoaderFunctionArgs)
  return { isSignedIn: !!userId }
}

// ─── Meta ────────────────────────────────────────────────────

export function meta(): Route.MetaDescriptors {
  return [
    { title: COPY.site.name },
    { name: 'description', content: COPY.site.catchcopy },
  ]
}

// ─── Page ────────────────────────────────────────────────────

export default function Home(): JSX.Element {
  const { isSignedIn } = useLoaderData<typeof loader>()
  return (
    <main className="min-h-screen bg-bg">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center min-h-[60vh] px-6 pt-24 pb-16 text-center">
        <div className="max-w-xl w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sunken text-text-secondary text-xs font-medium mb-6 tracking-wide">
            {COPY.site.name}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-text leading-tight mb-5">
            {COPY.site.catchcopy}
          </h1>
          <p className="text-text-secondary text-base leading-relaxed whitespace-pre-line mb-10">
            {COPY.site.subcopy}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isSignedIn
              ? (
                  <Link
                    to="/me"
                    className="btn-primary w-full sm:w-auto px-8 py-3 text-base"
                  >
                    {COPY.myPage.button}
                  </Link>
                )
              : (
                  <>
                    <Link
                      to="/sign-up"
                      className="btn-primary w-full sm:w-auto px-8 py-3 text-base"
                    >
                      {COPY.auth.signUpButton}
                    </Link>
                    <Link
                      to="/sign-in"
                      className="btn-secondary w-full sm:w-auto px-8 py-3 text-base"
                    >
                      ログイン
                    </Link>
                  </>
                )}
          </div>
        </div>
      </section>

      {/* ── How to ───────────────────────────────────────── */}
      <section className="px-6 py-20 bg-surface border-y border-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center text-text mb-12">
            {COPY.top.howToTitle}
          </h2>
          <ol className="flex flex-col sm:flex-row gap-6">
            {COPY.top.steps.map((step, i) => (
              <li key={step.title} className="card flex-1 p-6">
                <div className="text-3xl font-black text-border-strong mb-3 leading-none">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-bold text-text mb-1.5">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────── */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-text mb-3">
            {COPY.auth.ctaTitle}
          </h2>
          <p className="text-text-secondary text-sm mb-8">
            {isSignedIn ? COPY.myPage.loggedInSub : COPY.myPage.guestSub}
          </p>
          <Link
            to={isSignedIn ? '/me' : '/sign-up'}
            className="btn-primary inline-flex px-10 py-3 text-base"
          >
            {isSignedIn ? COPY.myPage.button : COPY.auth.signUpButton}
          </Link>
        </div>
      </section>
    </main>
  )
}
