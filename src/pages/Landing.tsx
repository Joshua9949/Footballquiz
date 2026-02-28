import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Users, Brain, ChevronRight, Zap, Award, Timer } from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "League Quizzes",
    description: "Test your knowledge across 10+ football leagues worldwide with timed challenges",
    to: "/quiz",
  },
  {
    icon: Users,
    title: "Player Trivia",
    description: "Quiz yourself on legends and current stars — stats, records, and career histories",
    to: "/players",
  },
  {
    icon: Award,
    title: "Manager Quiz",
    description: "How well do you know football's greatest tacticians and managers?",
    to: "/managers",
  },
  {
    icon: Brain,
    title: "AI Football Expert",
    description: "Ask anything about football — powered by real AI for unlimited knowledge",
    to: "/ai-chat",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, bounce: 0.3 } },
};

const stats = [
  { label: "Leagues", value: "11+" },
  { label: "Questions", value: "300+" },
  { label: "Difficulties", value: "3" },
  { label: "AI Powered", value: "✓" },
];

export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient px-4 py-24 text-pitch-foreground md:py-36">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pitch-foreground/20" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pitch-foreground/20" />
          <div className="absolute left-0 top-0 h-full w-px bg-pitch-foreground/10" style={{ left: "20%" }} />
          <div className="absolute left-0 top-0 h-full w-px bg-pitch-foreground/10" style={{ left: "80%" }} />
        </div>

        <motion.div
          className="relative mx-auto max-w-4xl text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-pitch-foreground/20 bg-pitch-foreground/10 px-4 py-2 text-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Zap className="h-4 w-4 text-gold" />
            The Ultimate Football Quiz Experience
          </motion.div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            How Well Do You
            <br />
            <span className="text-gradient-gold">Know Football?</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-pitch-foreground/70 md:text-xl">
            Challenge yourself with quizzes spanning Premier League, La Liga, Serie A, Champions League, and more. Timed mode, manager quizzes, and AI-powered chat.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/quiz"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-4 text-lg font-bold text-gold-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Start Playing
              <ChevronRight className="h-5 w-5" />
            </Link>
            <Link
              to="/ai-chat"
              className="inline-flex items-center gap-2 rounded-xl border border-pitch-foreground/20 bg-pitch-foreground/10 px-8 py-4 text-lg font-medium text-pitch-foreground transition-all hover:bg-pitch-foreground/20"
            >
              <Brain className="h-5 w-5" />
              Ask AI
            </Link>
          </div>

          {/* Stats */}
          <motion.div
            className="mx-auto mt-16 grid max-w-md grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-gold md:text-3xl">{s.value}</div>
                <div className="text-xs text-pitch-foreground/50">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Choose Your Challenge</h2>
          <p className="text-muted-foreground">Multiple ways to test your football knowledge</p>
        </motion.div>

        <motion.div
          className="grid gap-6 md:grid-cols-2"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item}>
              <Link
                to={f.to}
                className="group flex flex-col rounded-2xl border border-border bg-card p-8 transition-all card-hover"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-card-foreground">{f.title}</h3>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{f.description}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Leagues preview */}
      <section className="border-t border-border bg-muted/50 px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-8 text-3xl font-bold text-foreground">10+ Leagues & Competitions</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", "🇪🇸 La Liga", "🇮🇹 Serie A", "🇩🇪 Bundesliga", "🇫🇷 Ligue 1", "🏆 Champions League", "🇵🇹 Primeira Liga", "🇳🇱 Eredivisie", "🇧🇪 Belgian Pro", "🇺🇸 MLS", "🇹🇷 Süper Lig"].map(
              (league) => (
                <motion.span
                  key={league}
                  whileHover={{ scale: 1.05 }}
                  className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-card-foreground cursor-default"
                >
                  {league}
                </motion.span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground mb-16 md:mb-0">
        <p>⚽ FootQuiz — The Ultimate Football Quiz Experience</p>
      </footer>
    </div>
  );
}
