import FormEsqueci from "./FormEsqueci";

export default async function EsqueciSenha({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return <FormEsqueci linkInvalido={erro === "link"} />;
}