import { WorkshopPreparationScreen } from "@/components/workshop-preparation-screen";

type PageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function WorkshopPreparationPage({ params }: Readonly<PageProps>) {
  const { assignmentId } = await params;
  return <WorkshopPreparationScreen assignmentId={assignmentId} />;
}
