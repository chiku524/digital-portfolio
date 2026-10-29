export default function Home() {
  return (
    <div className="min-h-full bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-16 px-6 py-20 sm:px-10">
        <header className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Portfolio
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Nico Chikuji
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            AI-enhanced software engineer building thoughtful digital products.
          </p>
        </header>

        <section aria-labelledby="projects-heading" className="space-y-4">
          <h2
            id="projects-heading"
            className="text-sm font-medium uppercase tracking-widest text-zinc-500"
          >
            Projects
          </h2>
          <p className="text-zinc-500 dark:text-zinc-500">
            Projects will appear here soon.
          </p>
        </section>
      </main>
    </div>
  );
}
