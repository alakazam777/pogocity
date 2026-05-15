'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import cityConfig from '@/lib/cityConfig';

// Visible legal disclaimer + nav.
//
// Apple App Store reviewers want the "not affiliated" notice clearly visible
// somewhere the average user can read it — burying it inside /terms is
// necessary but not sufficient. App Store v1.0 was rejected partly under
// guideline 4.1(a) (Copycats) for our metadata naming third-party rights
// holders by name; rather than risk the same flag on the live site itself,
// the disclaimer is now phrased generically ("any monster-catching game").
// Trademark holders can still enforce their rights — the disclaimer's job
// is to communicate non-affiliation, not to recite their corporate names.

export default function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="mt-0 pt-10 pb-12 border-t border-white/10 text-xs text-gray-500 bg-[#0a0a0a]">
            <div className="max-w-3xl mx-auto px-6 space-y-4 text-center">
                <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                    <Link href="/terms" className="hover:text-gray-300 transition-colors">
                        {t('footer.terms') || 'Terms of Service'}
                    </Link>
                    <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                        {t('footer.privacy') || 'Privacy Policy'}
                    </Link>
                    <Link href="/account-deletion" className="hover:text-gray-300 transition-colors">
                        {t('footer.deleteAccount') || 'Delete Account'}
                    </Link>
                </nav>

                <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
                    {t('footer.disclaimer') ||
                        `${cityConfig.siteName} is a free, fan-made, non-commercial community portal, independent of the publishers and developers of any monster-catching game. All third-party trademarks belong to their respective owners and are used here for community purposes only.`}
                </p>

                <p className="text-gray-700">© {new Date().getFullYear()} {cityConfig.siteName}</p>
            </div>
        </footer>
    );
}
