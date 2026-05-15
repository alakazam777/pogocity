// Legal page content — Privacy Policy, Terms of Service, Account Deletion.
// Brand name, operator name and contact details are placeholders —
// {SITE}, {OPERATOR}, {EMAIL}, {DISCORD} — filled from city.config.js at
// import time. Edit city.config.js, not the legal text below.
import cityConfig from './cityConfig';

const SUBS = { '{SITE}': cityConfig.siteName, '{OPERATOR}': cityConfig.contact.operatorName, '{EMAIL}': cityConfig.contact.email, '{DISCORD}': cityConfig.contact.discord };

// Recursively fill {PLACEHOLDER} tokens in every string of a nested object.
function fill(v) {
    if (typeof v === 'string') return v.replace(/\{SITE\}|\{OPERATOR\}|\{EMAIL\}|\{DISCORD\}/g, (m) => SUBS[m]);
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, fill(val)]));
    return v;
}

export const LEGAL_LAST_UPDATED = '2026-05-10';
export const TERMS_VERSION = '2026-05-11-ugc-v3';

export const ACCOUNT_DELETION = fill({
    en: {
        title: 'Account & Data Deletion',
        lastUpdated: 'Last updated',
        intro: 'You can request the deletion of your {SITE} account and all associated data at any time. This page describes exactly how to request deletion, what is deleted, and what (if anything) is retained.',
        sections: [
            {
                heading: 'How to request deletion',
                body: 'Send a deletion request by EITHER of these channels — both reach the same operator ({OPERATOR}):\n\n• Email: {EMAIL} (subject line: "{SITE} account deletion")\n• Discord: send a direct message to the user "{DISCORD}"\n\nInclude in your message: your Discord username (so we can identify the account) and a clear sentence such as "Please delete my {SITE} account and all associated data."\n\nWe will confirm receipt within 48 hours and complete the deletion within 7 days.',
            },
            {
                heading: 'Data that will be deleted',
                body: 'Your trainer profile (level, team, city, friend code), Pokémon checklist progress, photo gallery uploads, presentation/introduction posts, message replies, community group submissions associated with your account, and your Discord identifier (username, display name, avatar URL) will all be permanently removed from our database within 7 days of receiving your request.',
            },
            {
                heading: 'Data that may be retained',
                body: 'For up to 30 additional days after deletion, anonymized server logs may retain technical request records (HTTP method, timestamp, response code) for security and abuse-prevention purposes. These logs do not include any personal identifier and are auto-purged after 30 days. After this 30-day window, no record of your account remains.',
            },
            {
                heading: 'Approved community group submissions',
                body: 'If you submitted community groups (Discord/Campfire/etc.) that were approved by moderators and are now publicly visible on city pages, those approved entries are NOT automatically deleted with your account — they belong to the community. If you want a specific community submission removed, mention it in your deletion request and we will remove it.',
            },
            {
                heading: 'Partial deletion',
                body: 'You can also request deletion of only specific data (e.g., only your friend code, only your checklist progress) without deleting your entire account. Same procedure: email or Discord with the specific items you want removed.',
            },
            {
                heading: 'Mobile app',
                body: 'The {SITE} Android app is a thin webview wrapper over this website. The same deletion procedure applies whether you use the website or the mobile app — there is no separate app-side data store.',
            },
            {
                heading: 'Contact',
                body: 'Email: {EMAIL} — Discord: {DISCORD}',
            },
        ],
    },
    fr: {
        title: 'Suppression de compte et de données',
        lastUpdated: 'Dernière mise à jour',
        intro: 'Vous pouvez demander à tout moment la suppression de votre compte {SITE} et de toutes les données associées. Cette page décrit précisément comment effectuer la demande, ce qui est supprimé, et ce qui (le cas échéant) est conservé.',
        sections: [
            {
                heading: 'Comment demander la suppression',
                body: 'Envoyez une demande par UN des deux canaux ci-dessous — les deux atteignent le même opérateur ({OPERATOR}) :\n\n• Email : {EMAIL} (objet : « Suppression compte {SITE} »)\n• Discord : message privé à l\'utilisateur « {DISCORD} »\n\nIndiquez dans votre message : votre pseudo Discord (pour identifier le compte) et une phrase claire telle que « Merci de supprimer mon compte {SITE} et toutes les données associées ».\n\nNous accusons réception sous 48 heures et complétons la suppression sous 7 jours.',
            },
            {
                heading: 'Données qui seront supprimées',
                body: 'Votre profil de dresseur (niveau, équipe, ville, code ami), votre progression de Pokédex, vos photos uploadées, vos présentations/introductions, vos réponses aux messages, vos soumissions de groupes communautaires associées à votre compte, ainsi que votre identifiant Discord (pseudo, nom affiché, URL d\'avatar) seront définitivement supprimés de notre base de données sous 7 jours après réception de votre demande.',
            },
            {
                heading: 'Données pouvant être conservées',
                body: 'Pendant une durée additionnelle de 30 jours après la suppression, les journaux serveur anonymisés peuvent conserver des enregistrements techniques (méthode HTTP, horodatage, code de réponse) à des fins de sécurité et de prévention des abus. Ces journaux ne contiennent aucun identifiant personnel et sont automatiquement purgés après 30 jours.',
            },
            {
                heading: 'Soumissions communautaires approuvées',
                body: 'Si vous avez soumis des groupes communautaires (Discord/Campfire/etc.) qui ont été approuvés et sont désormais publiquement visibles sur les pages de villes, ces entrées approuvées ne sont PAS automatiquement supprimées avec votre compte — elles appartiennent à la communauté. Si vous souhaitez la suppression d\'une soumission spécifique, indiquez-le dans votre demande.',
            },
            {
                heading: 'Suppression partielle',
                body: 'Vous pouvez aussi demander la suppression de certaines données uniquement (ex : juste votre code ami, juste votre Pokédex) sans supprimer tout votre compte. Même procédure : email ou Discord avec la liste précise des éléments à supprimer.',
            },
            {
                heading: 'Application mobile',
                body: 'L\'application Android {SITE} est une enveloppe webview au-dessus de ce site. La même procédure de suppression s\'applique que vous utilisiez le site ou l\'application — il n\'y a pas de stockage de données séparé côté app.',
            },
            {
                heading: 'Contact',
                body: 'Email : {EMAIL} — Discord : {DISCORD}',
            },
        ],
    },
    ja: {
        title: 'アカウントとデータの削除',
        lastUpdated: '最終更新日',
        intro: '{SITE}アカウントおよび関連するすべてのデータの削除をいつでもリクエストできます。このページでは、削除のリクエスト方法、削除される内容、保持される内容（ある場合）について説明します。',
        sections: [
            {
                heading: '削除のリクエスト方法',
                body: '次のいずれかの方法でリクエストを送信してください（どちらも同じ運営者「{OPERATOR}」に届きます）：\n\n• メール：{EMAIL}（件名：「{SITE}アカウント削除」）\n• Discord：ユーザー「{DISCORD}」にダイレクトメッセージ\n\nメッセージに含めてください：Discordユーザー名（アカウントを特定するため）と「{SITE}アカウントとすべての関連データを削除してください」のような明確な文章。\n\n48時間以内に受領を確認し、7日以内に削除を完了します。',
            },
            { heading: '削除されるデータ', body: 'トレーナープロフィール（レベル、チーム、都市、フレンドコード）、ポケモンチェックリストの進捗、アップロードした写真、自己紹介投稿、メッセージへの返信、アカウントに関連付けられたコミュニティグループの投稿、Discord識別子（ユーザー名、表示名、アバターURL）は、リクエスト受領から7日以内に当社のデータベースから永久に削除されます。' },
            { heading: '保持される可能性のあるデータ', body: '削除後最大30日間、匿名化されたサーバーログがセキュリティと不正防止の目的で技術的なリクエスト記録を保持する場合があります。これらのログには個人識別子は含まれず、30日後に自動的に削除されます。' },
            { heading: '承認済みコミュニティ投稿', body: '承認されて公開されているコミュニティグループの投稿は、アカウントとともに自動的に削除されません。特定の投稿の削除を希望する場合は、削除リクエストでお知らせください。' },
            { heading: '部分的な削除', body: '一部のデータのみ（フレンドコードのみ、チェックリストのみ等）の削除も、アカウント全体を削除せずにリクエストできます。同じ手順でメールまたはDiscordで具体的な項目を指定してください。' },
            { heading: 'モバイルアプリ', body: '{SITE} Androidアプリはこのウェブサイトの上にあるWebViewラッパーです。同じ削除手順がウェブサイトとモバイルアプリの両方に適用されます。' },
            { heading: 'お問い合わせ', body: 'メール：{EMAIL} — Discord：{DISCORD}' },
        ],
    },
});

export const PRIVACY = fill({
    en: {
        title: 'Privacy Policy',
        lastUpdated: 'Last updated',
        intro: '{SITE} ("we", "the service") is a fan-made community portal for monster-catching trainers worldwide. We respect your privacy and keep data collection to the minimum required to operate the service.',
        sections: [
            {
                heading: 'What we collect',
                body: 'When you sign in with Discord, we store your Discord username, display name, and avatar URL. If you choose to fill in trainer information, we additionally store your in-game level, team (Mystic / Valor / Instinct), city, and friend code. Community group submissions you make include the group name, type, and URL you provide.',
            },
            {
                heading: 'What we DO NOT collect',
                body: 'We do not collect your IP address for tracking. We do not use analytics, advertising trackers, or third-party tracking pixels. We do not access your contacts, location, camera, microphone, or any other device permissions beyond what the website itself uses in your browser session.',
            },
            {
                heading: 'How we use it',
                body: 'Your trainer data appears on public profile pages, leaderboards, and city community panels — exactly where you place it through the app. We do not sell, rent, or share your data with third parties for marketing or advertising. We never share your data with any third party for purposes outside the operation of {SITE}.',
            },
            {
                heading: 'Authentication',
                body: 'Sign-in is handled by Discord OAuth. We receive only the basic Discord profile fields you authorize during the consent screen — we never see your Discord password.',
            },
            {
                heading: 'Cookies',
                body: 'We use a session cookie to keep you signed in. We use localStorage to remember your language preference and other UI settings on your device. No advertising cookies are set.',
            },
            {
                heading: 'Data retention & deletion',
                body: 'Your data is kept as long as your account exists. To delete your data, message the operator on Discord ({DISCORD}) or email {EMAIL} — your trainer record and community submissions will be deleted within 7 days.',
            },
            {
                heading: 'Children',
                body: '{SITE} is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us data, contact us and we will remove it.',
            },
            {
                heading: 'Mobile app ({SITE} for Android)',
                body: 'The Android app is a thin webview wrapper that loads the {SITE} website over HTTPS. It requests only the INTERNET permission. No additional data is collected by the app itself; the same privacy practices described above apply.',
            },
            {
                heading: 'Changes',
                body: 'If this policy changes materially we will update the "Last updated" date at the top. Continued use of {SITE} after changes means you accept the updated policy.',
            },
            {
                heading: 'Contact',
                body: 'Questions? Email {EMAIL} or reach out on Discord ({DISCORD}).',
            },
        ],
    },
    fr: {
        title: 'Politique de confidentialité',
        lastUpdated: 'Dernière mise à jour',
        intro: '{SITE} (« nous », « le service ») est un portail communautaire fan-made pour les dresseurs de jeux de capture de créatures du monde entier. Nous respectons votre vie privée et limitons la collecte de données au strict minimum nécessaire pour faire fonctionner le service.',
        sections: [
            {
                heading: 'Ce que nous collectons',
                body: 'Lors de la connexion via Discord, nous stockons votre pseudo Discord, votre nom affiché et l\'URL de votre avatar. Si vous renseignez vos informations de dresseur, nous stockons également votre niveau, votre équipe (Sagesse / Bravoure / Intuition), votre ville et votre code ami. Les groupes communautaires que vous soumettez contiennent le nom du groupe, son type et l\'URL fournie.',
            },
            {
                heading: 'Ce que nous NE collectons PAS',
                body: 'Nous ne collectons pas votre adresse IP à des fins de suivi. Nous n\'utilisons aucun outil d\'analyse, ni traceurs publicitaires, ni pixels de suivi tiers. Nous n\'accédons pas à vos contacts, votre position, votre caméra, votre micro ou toute autre permission au-delà de ce que le site lui-même utilise dans votre navigateur.',
            },
            {
                heading: 'Utilisation des données',
                body: 'Vos données de dresseur apparaissent sur les pages de profil publiques, les rankings et les panneaux des communautés — exactement là où vous les placez via l\'application. Nous ne vendons, ne louons et ne partageons pas vos données avec des tiers à des fins marketing ou publicitaires.',
            },
            {
                heading: 'Authentification',
                body: 'La connexion est gérée par OAuth Discord. Nous recevons uniquement les champs de base du profil Discord que vous autorisez lors de l\'écran de consentement — nous ne voyons jamais votre mot de passe Discord.',
            },
            {
                heading: 'Cookies',
                body: 'Nous utilisons un cookie de session pour vous garder connecté(e). Nous utilisons le localStorage pour mémoriser votre préférence de langue et d\'autres paramètres d\'interface sur votre appareil. Aucun cookie publicitaire n\'est déposé.',
            },
            {
                heading: 'Conservation et suppression des données',
                body: 'Vos données sont conservées tant que votre compte existe. Pour supprimer vos données, contactez l\'opérateur sur Discord ({DISCORD}) ou envoyez un email à {EMAIL} — votre fiche de dresseur et vos soumissions seront supprimées sous 7 jours.',
            },
            {
                heading: 'Enfants',
                body: '{SITE} ne s\'adresse pas aux enfants de moins de 13 ans. Nous ne collectons pas sciemment de données auprès d\'enfants de moins de 13 ans. Si vous pensez qu\'un enfant nous a fourni des données, contactez-nous et nous les supprimerons.',
            },
            {
                heading: 'Application mobile ({SITE} pour Android)',
                body: 'L\'application Android est une simple enveloppe webview qui charge le site {SITE} en HTTPS. Elle demande uniquement la permission INTERNET. Aucune donnée supplémentaire n\'est collectée par l\'application elle-même ; les mêmes pratiques de confidentialité décrites ci-dessus s\'appliquent.',
            },
            {
                heading: 'Modifications',
                body: 'Si cette politique change de manière significative, nous mettrons à jour la date « Dernière mise à jour » en haut. L\'utilisation continue de {SITE} après ces changements signifie que vous acceptez la politique mise à jour.',
            },
            {
                heading: 'Contact',
                body: 'Des questions ? Email : {EMAIL} — ou contactez-nous sur Discord ({DISCORD}).',
            },
        ],
    },
    ja: {
        title: 'プライバシーポリシー',
        lastUpdated: '最終更新日',
        intro: '{SITE}（「当サービス」）は、世界中のポケモンGOトレーナー向けの非公式コミュニティポータルです。プライバシーを尊重し、サービス運営に必要な最小限のデータのみを収集します。',
        sections: [
            {
                heading: '収集する情報',
                body: 'Discordでサインインすると、Discordユーザー名、表示名、アバターURLを保存します。トレーナー情報を入力された場合、ゲーム内レベル、チーム（青／赤／黄）、都市、フレンドコードも保存します。コミュニティグループの投稿には、グループ名、種類、提供されたURLが含まれます。',
            },
            {
                heading: '収集しない情報',
                body: '追跡目的でのIPアドレスは収集しません。アナリティクス、広告トラッカー、サードパーティのトラッキングピクセルは使用しません。連絡先、位置情報、カメラ、マイク、その他のデバイス権限にはアクセスしません。',
            },
            {
                heading: '情報の使用方法',
                body: 'トレーナーデータは、公開プロフィール、ランキング、都市コミュニティパネルに表示されます。マーケティングや広告目的で第三者に販売、貸与、共有することはありません。',
            },
            {
                heading: '認証',
                body: 'サインインはDiscord OAuthで処理されます。同意画面で承認した基本的なDiscordプロフィール情報のみを受信します。Discordのパスワードを見ることはありません。',
            },
            {
                heading: 'クッキー',
                body: 'サインインを維持するためのセッションクッキーを使用します。言語設定やUI設定をデバイス上に記憶するためにlocalStorageを使用します。広告クッキーは設定されません。',
            },
            {
                heading: 'データの保持と削除',
                body: 'データはアカウントが存在する限り保持されます。データの削除をご希望の場合は、Discord（{DISCORD}）またはメール（{EMAIL}）でご連絡ください。7日以内に削除されます。',
            },
            {
                heading: '児童について',
                body: '{SITE}は13歳未満の児童を対象としていません。13歳未満の児童からデータを意図的に収集することはありません。',
            },
            {
                heading: 'モバイルアプリ（{SITE} for Android）',
                body: 'AndroidアプリはHTTPS経由で{SITE}ウェブサイトを読み込む薄いWebViewラッパーです。INTERNET権限のみを要求します。アプリ自体による追加のデータ収集はありません。',
            },
            {
                heading: '変更',
                body: 'このポリシーが大きく変更される場合、上部の「最終更新日」を更新します。変更後も{SITE}を使用し続けることは、更新されたポリシーへの同意を意味します。',
            },
            {
                heading: 'お問い合わせ',
                body: 'ご質問は {EMAIL}、またはDiscord（{DISCORD}）まで。',
            },
        ],
    },
});

export const TERMS = fill({
    en: {
        title: 'Terms of Service',
        lastUpdated: 'Last updated',
        intro: 'By accessing {SITE} ("the service"), you agree to these terms. {SITE} is a free, fan-made, non-commercial community portal for monster-catching trainers. It is not affiliated with, endorsed by, or sponsored by the publishers or developers of any monster-catching game.',
        sections: [
            {
                heading: 'Eligibility',
                body: 'You must be at least 13 years old to use {SITE}. By using the service, you confirm you meet this requirement.',
            },
            {
                heading: 'User content and zero tolerance for objectionable content',
                body: '{SITE} has ZERO TOLERANCE for objectionable content or abusive users. You are responsible for the content you post (community group submissions, trainer info, presentations, comments, direct messages, trade lists, friend codes, and any other user-submitted text or media).\n\nYou must NOT post or upload any content that is:\n• Illegal under applicable law\n• Harassing, threatening, hateful, defamatory, or discriminatory\n• Sexually explicit, pornographic, or harmful to minors\n• Violent, gory, or that promotes or glorifies violence\n• Spam, scams, phishing, or unsolicited advertising\n• Designed to impersonate another person\n• In violation of anyone\'s intellectual property rights or privacy\n\nWe will remove any content reported as objectionable within 24 hours of receiving the report, and we will eject any user who has provided offending content. We may take action without notice when we determine in good faith that content violates these terms.',
            },
            {
                heading: 'Reporting and blocking abusive users',
                body: 'Every user-generated content surface in {SITE} (trainer profiles, trades, friend codes, presentations, direct messages, community submissions) provides a "Report" button you can use to flag content as objectionable. You can also "Block" any user, which:\n\n• Instantly hides that user\'s content from your feed\n• Prevents that user from sending you messages or interacting with your content\n• Notifies the {SITE} moderators of the block reason\n\nReports and blocks are processed within 24 hours. If we confirm the reported content violates these terms, the content is removed and the offending user is suspended or terminated. To file an out-of-band report, email {EMAIL} (subject line: "{SITE} abuse report").',
            },
            {
                heading: 'Account',
                body: 'You can sign in with Sign in with Apple, Discord, or a username/password. You are responsible for all activity under your account. If you believe your account has been compromised, contact us immediately.',
            },
            {
                heading: 'Acceptable use',
                body: 'Do not attempt to disrupt the service, scrape it at unreasonable rates, exploit security vulnerabilities, or use it to send spam, phishing, or unsolicited advertising.',
            },
            {
                heading: 'Intellectual property',
                body: 'All third-party game titles, character names, and related trademarks and assets are property of their respective owners. {SITE} uses these references nominatively for community purposes only and claims no ownership over them.',
            },
            {
                heading: 'No warranty',
                body: '{SITE} is provided "as is", without warranty of any kind. We do not guarantee the service will be available, accurate, or error-free.',
            },
            {
                heading: 'Limitation of liability',
                body: 'To the maximum extent permitted by law, the operator of {SITE} is not liable for any indirect, incidental, or consequential damages arising from your use of the service.',
            },
            {
                heading: 'Termination',
                body: 'We may suspend or terminate your access at any time if you violate these terms. You may stop using the service at any time.',
            },
            {
                heading: 'Changes to terms',
                body: 'We may update these terms occasionally. Continued use after changes means you accept the updated terms.',
            },
            {
                heading: 'Contact',
                body: 'Email {EMAIL} or message {DISCORD} on Discord with any questions.',
            },
        ],
    },
    fr: {
        title: 'Conditions d\'utilisation',
        lastUpdated: 'Dernière mise à jour',
        intro: 'En accédant à {SITE} (« le service »), vous acceptez ces conditions. {SITE} est un portail communautaire gratuit, fan-made et non commercial pour les dresseurs de jeux de capture de créatures. Il n\'est ni affilié, ni soutenu, ni sponsorisé par les éditeurs ou développeurs d\'un jeu de capture de créatures.',
        sections: [
            {
                heading: 'Éligibilité',
                body: 'Vous devez avoir au moins 13 ans pour utiliser {SITE}. En utilisant le service, vous confirmez remplir cette condition.',
            },
            {
                heading: 'Contenu utilisateur et tolérance zéro pour le contenu inapproprié',
                body: '{SITE} applique une TOLÉRANCE ZÉRO envers tout contenu inapproprié ou comportement abusif. Vous êtes responsable du contenu que vous publiez (soumissions de groupes communautaires, infos de dresseur, présentations, commentaires, messages directs, listes d\'échanges, codes amis et tout autre texte ou média soumis par l\'utilisateur).\n\nVous ne devez PAS publier ou téléverser de contenu :\n• Illégal selon la loi applicable\n• Harcelant, menaçant, haineux, diffamatoire ou discriminatoire\n• Sexuellement explicite, pornographique, ou nuisible aux mineurs\n• Violent, sanglant, ou qui promeut ou glorifie la violence\n• De type spam, escroquerie, hameçonnage ou publicité non sollicitée\n• Visant à se faire passer pour autrui\n• Enfreignant la propriété intellectuelle ou la vie privée d\'autrui\n\nNous retirerons tout contenu signalé comme inapproprié dans les 24 heures suivant la réception du signalement, et nous éjecterons tout utilisateur ayant publié un tel contenu. Nous pouvons agir sans préavis lorsque nous estimons de bonne foi que le contenu enfreint ces conditions.',
            },
            {
                heading: 'Signalement et blocage des utilisateurs abusifs',
                body: 'Chaque surface de contenu utilisateur dans {SITE} (profils de dresseur, échanges, codes amis, présentations, messages directs, soumissions communautaires) propose un bouton « Signaler » pour signaler un contenu comme inapproprié. Vous pouvez aussi « Bloquer » n\'importe quel utilisateur, ce qui :\n\n• Masque instantanément le contenu de cet utilisateur de votre fil\n• Empêche cet utilisateur de vous envoyer des messages ou d\'interagir avec votre contenu\n• Notifie l\'équipe de modération {SITE} du motif du blocage\n\nLes signalements et les blocages sont traités dans les 24 heures. Si nous confirmons que le contenu signalé enfreint ces conditions, le contenu est retiré et l\'utilisateur fautif est suspendu ou banni. Pour signaler un abus hors application, écrivez à {EMAIL} (objet : « Signalement abus {SITE} »).',
            },
            {
                heading: 'Compte',
                body: 'Vous pouvez vous connecter avec Sign in with Apple, Discord, ou un identifiant/mot de passe. Vous êtes responsable de toute activité sous votre compte. Si vous pensez que votre compte a été compromis, contactez-nous immédiatement.',
            },
            {
                heading: 'Utilisation acceptable',
                body: 'Ne tentez pas de perturber le service, de le scraper à des cadences déraisonnables, d\'exploiter des failles de sécurité, ou de l\'utiliser pour envoyer du spam, du phishing ou de la publicité non sollicitée.',
            },
            {
                heading: 'Propriété intellectuelle',
                body: 'Les titres de jeux tiers, les noms de personnages et les marques associées sont la propriété de leurs ayants droit respectifs. {SITE} utilise ces références à des fins communautaires uniquement et ne revendique aucun droit dessus.',
            },
            {
                heading: 'Absence de garantie',
                body: '{SITE} est fourni « tel quel », sans garantie d\'aucune sorte. Nous ne garantissons pas que le service sera disponible, exact ou exempt d\'erreurs.',
            },
            {
                heading: 'Limitation de responsabilité',
                body: 'Dans toute la mesure permise par la loi, l\'opérateur de {SITE} n\'est pas responsable des dommages indirects, accessoires ou consécutifs résultant de votre utilisation du service.',
            },
            {
                heading: 'Résiliation',
                body: 'Nous pouvons suspendre ou résilier votre accès à tout moment si vous violez ces conditions. Vous pouvez cesser d\'utiliser le service à tout moment.',
            },
            {
                heading: 'Modifications',
                body: 'Nous pouvons mettre à jour ces conditions occasionnellement. L\'utilisation continue après modification implique l\'acceptation des conditions mises à jour.',
            },
            {
                heading: 'Contact',
                body: 'Email : {EMAIL} ou contactez {DISCORD} sur Discord pour toute question.',
            },
        ],
    },
    ja: {
        title: '利用規約',
        lastUpdated: '最終更新日',
        intro: '{SITE}（「当サービス」）にアクセスすることで、これらの規約に同意したものとみなされます。{SITE}は、モンスター収集ゲームのトレーナー向けの無料の非公式・非商用コミュニティポータルです。モンスター収集ゲームの編集者および開発者とは関係ありません。',
        sections: [
            { heading: '利用資格', body: '{SITE}を使用するには13歳以上である必要があります。' },
            { heading: 'ユーザーコンテンツ', body: '投稿するコンテンツ（コミュニティグループ、トレーナー情報、プレゼンテーション、コメント）について責任を負います。違法、ハラスメント、ヘイト、性的に露骨、または他者の知的財産を侵害する内容を投稿してはなりません。' },
            { heading: 'アカウント', body: 'Discordでサインインします。アカウント下のすべての活動について責任を負います。' },
            { heading: '許容される使用', body: 'サービスを妨害したり、不当な頻度でスクレイピングしたり、セキュリティ脆弱性を悪用したり、スパムやフィッシングに使用しないでください。' },
            { heading: '知的財産', body: '第三者のゲームタイトル、キャラクター名、関連商標および資産は、それぞれの所有者の財産です。{SITE}はこれらをコミュニティ目的でのみ参照しており、所有権を主張しません。' },
            { heading: '無保証', body: '{SITE}は「現状のまま」提供され、いかなる保証もありません。' },
            { heading: '責任の制限', body: '法律で許される最大限の範囲で、{SITE}の運営者はサービスの使用から生じる間接的、付随的、結果的損害について責任を負いません。' },
            { heading: '終了', body: 'これらの規約に違反した場合、いつでもアクセスを停止または終了することがあります。' },
            { heading: '規約の変更', body: '規約を時々更新する場合があります。変更後も継続して使用することは、更新された規約への同意を意味します。' },
            { heading: 'お問い合わせ', body: '{EMAIL}、またはDiscord（{DISCORD}）までご連絡ください。' },
        ],
    },
});
