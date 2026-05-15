import DresseursPage from '../page';

export default async function TrainerPage({ params }) {
    const { username } = await params;
    return <DresseursPage initialTrainer={username} />;
}
