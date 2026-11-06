import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ZeroMockFeatures from "@/components/ZeroMockFeatures";
import ProtocolMatrix from "@/components/ProtocolMatrix";
import Architecture from "@/components/Architecture";
import LanguageTabs from "@/components/LanguageTabs";
import UseCases from "@/components/UseCases";
import Quickstart from "@/components/Quickstart";
import FaqSection from "@/components/FaqSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="flex-1 flex flex-col">
        <Hero />
        <ZeroMockFeatures />
        <ProtocolMatrix />
        <Architecture />
        <LanguageTabs />
        <UseCases />
        <Quickstart />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
