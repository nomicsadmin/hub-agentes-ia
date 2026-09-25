import { redirect } from "next/navigation"

/* A raiz abre uma conversa nova (também é o start_url do app instalado). */
export default function Home() {
  redirect("/chat")
}
