'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function CampfirePage() {
    const router = useRouter();
    const { t } = useLanguage();

    useEffect(() => {
        window.location.href = 'https://campfire.onelink.me/eBr8?af_dp=campfire://&af_force_deeplink=true&deep_link_sub1=cj1jbHVicyZjPWY4N2NlNGNkLTIwYmEtNDBkYi05MTdjLTAwMzUzMTdkOTQxNSZpPXRydWU=';
    }, []);

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">{t('common.redirectingCampfire')}</p>
            </div>
        </div>
    );
}
