import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="bg-digest-red px-2 py-1 font-admin text-sm font-bold text-paper">
                LAW
              </span>
              <span className="font-admin text-xl font-bold uppercase tracking-wide">
                DIGEST
              </span>
            </Link>
            <p className="mt-4 max-w-xs font-body-serif text-sm leading-relaxed text-stone">
              Africa&rsquo;s premier law journal — legal practice, policy, and
              commentary across Nigeria and beyond.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="block h-px w-8 bg-digest-red" />
              <span className="font-utility text-[10px] uppercase tracking-wide text-stone">
                ISSN 2053-3209
              </span>
            </div>
          </div>

          <div className="font-admin text-sm">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-stone">
              Contact
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:webmaster@nglawdigestblog.com"
                  className="transition-colors duration-300 hover:text-digest-red"
                >
                  webmaster@nglawdigestblog.com
                </a>
              </li>
              <li className="text-paper/80">+234 803 539 3330</li>
              <li className="text-paper/80">+44 203 223 0805</li>
            </ul>
          </div>

          <div className="font-admin text-sm">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-stone">
              Quick Links
            </p>
            <ul className="space-y-3">
              <li>
                <Link href="/articles" className="transition-colors duration-300 hover:text-digest-red">
                  Latest Articles
                </Link>
              </li>
              <li>
                <Link href="/issues" className="transition-colors duration-300 hover:text-digest-red">
                  Issues
                </Link>
              </li>
              <li>
                <Link href="/contributors" className="transition-colors duration-300 hover:text-digest-red">
                  Editorial Board
                </Link>
              </li>
              <li>
                <Link href="/events" className="transition-colors duration-300 hover:text-digest-red">
                  Events
                </Link>
              </li>
              <li>
                <a href="/law-digest-issue.pdf" download className="transition-colors duration-300 hover:text-digest-red">
                  Download PDF
                </a>
              </li>
              <li>
                <Link href="/about" className="transition-colors duration-300 hover:text-digest-red">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors duration-300 hover:text-digest-red">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-paper/10 pt-8 sm:flex-row">
          <p className="font-admin text-[11px] uppercase tracking-wide text-stone">
            &copy; {new Date().getFullYear()} Law Digest. All rights reserved.
          </p>
          <p className="font-admin text-[11px] uppercase tracking-wide text-stone">
            Africa&apos;s Premier Law Journal
          </p>
        </div>
      </div>
    </footer>
  );
}
