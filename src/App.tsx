import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import Landing from "./pages/Landing";
import QuizSetup from "./pages/QuizSetup";
import QuizGame from "./pages/QuizGame";
import PlayerQuiz from "./pages/PlayerQuiz";
import ManagerQuiz from "./pages/ManagerQuiz";
import AIChat from "./pages/AIChat";
import ContractQuizGame from "./pages/ContractQuizGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/quiz" element={<QuizSetup />} />
            <Route path="/quiz/contract" element={<ContractQuizGame />} />
            <Route path="/quiz/:leagueId/:difficulty" element={<QuizGame />} />
            <Route path="/players" element={<PlayerQuiz />} />
            <Route path="/managers" element={<ManagerQuiz />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
