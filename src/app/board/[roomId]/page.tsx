import type { Metadata } from 'next';
import CollaborativeWhiteboardApp from '../../../components/CollaborativeWhiteboardApp';

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roomId } = await params;
  return {
    title: `Board: ${roomId} — Realtime Whiteboard`,
  };
}

export default async function BoardPage({ params }: PageProps) {
  const { roomId } = await params;
  return <CollaborativeWhiteboardApp roomId={roomId} />;
}
