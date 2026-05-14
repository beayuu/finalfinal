import { ActionCardsSection } from "./sections/ActionCardsSection";
import { HeroContentSection } from "./sections/HeroContentSection";
import { NavigationBarSection } from "./sections/NavigationBarSection";

const socialLinks = [
  {
    alt: "Social links",
    src: "/figmaAssets/social-links.svg",
  },
];

export const HomePage = (): JSX.Element => {
  return (
    <main className="relative w-full overflow-x-hidden bg-black">
      <NavigationBarSection />
      <section
        id="home"
        className="relative overflow-hidden bg-black scroll-mt-24"
        aria-label="Hero section"
      >
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src="/coral_reef_underwater.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[rgba(5,38,152,0.45)]" />
        <div className="absolute inset-x-0 bottom-0 h-[212px] bg-[linear-gradient(180deg,rgba(5,38,152,0)_0%,rgba(17,107,248,0.7)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[1024px] w-full max-w-[1440px] flex-col">
          <div className="flex flex-1 items-start justify-center pt-32 md:pt-36">
            <HeroContentSection />
          </div>
        </div>
      </section>
      <section id="adopt" className="bg-black pt-8 pb-20 md:pt-12 md:pb-28 scroll-mt-24">
        <div className="mx-auto w-full max-w-[1440px]">
          <ActionCardsSection />
        </div>
      </section>
      <section id="volunteer" className="scroll-mt-24" aria-hidden="true" />
      <footer id="contacts" className="bg-[linear-gradient(90deg,rgba(5,38,152,1)_0%,rgba(17,107,248,1)_50%,rgba(33,188,238,1)_100%)] shadow-[0px_-4px_10px_#00000040] scroll-mt-24">
        <div className="mx-auto w-full max-w-[1440px] border-t border-[#00000026] px-[30px] py-16 sm:px-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="[font-family:'Inter',Helvetica] text-2xl font-normal leading-[28.8px] tracking-[-0.48px] text-white">
              Let&apos;s work together
            </p>
            <nav aria-label="Social media">
              {socialLinks.map((link) => (
                <img
                  key={link.src}
                  className="h-6 w-[120px]"
                  alt={link.alt}
                  src={link.src}
                />
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
};
