export function StudentApp() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-12">
      <header className="mb-12">
        <h1 className="font-display text-4xl font-semibold text-penn-blue">
          VIPER Four-Year Planner
        </h1>
        <p className="mt-2 text-sm text-ink/70">
          Plan your BA + BSE across eight semesters and three summers.
        </p>
      </header>
      <main>{/* ScheduleGrid lands here */}</main>
      <footer className="mt-16 border-t border-hairline pt-6 text-xs text-ink/50">
        VIPER Planner is a student-built tool, not an official University of
        Pennsylvania application.
      </footer>
    </div>
  )
}
