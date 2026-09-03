import { GradientDefs } from "@/components/ui/GradientDefs";
import { PageIntro } from "@/components/PageIntro";
import { Hero } from "@/components/sections/Hero";
import { Category } from "@/components/sections/Category";
import { Trending } from "@/components/sections/Trending";
import { Workspace } from "@/components/sections/Workspace";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Features } from "@/components/sections/Features";
import { Connect } from "@/components/sections/Connect";
import { WhyChooseUs } from "@/components/sections/WhyChooseUs";
import { Creator } from "@/components/sections/Creator";
import { SocialProof } from "@/components/sections/SocialProof";
import { Pricing } from "@/components/sections/Pricing";
import { Cta } from "@/components/sections/Cta";
import { Footer } from "@/components/sections/Footer";
import { HeroMobile } from "@/components/mobile/HeroMobile";
import { CategoryMobile } from "@/components/mobile/CategoryMobile";
import { TrendingMobile } from "@/components/mobile/TrendingMobile";
import { WorkspaceMobile } from "@/components/mobile/WorkspaceMobile";
import { HowItWorksMobile } from "@/components/mobile/HowItWorksMobile";
import { WhyChooseUsMobile } from "@/components/mobile/WhyChooseUsMobile";
import { CreatorMobile } from "@/components/mobile/CreatorMobile";
import { SocialProofMobile } from "@/components/mobile/SocialProofMobile";
import { PricingMobile } from "@/components/mobile/PricingMobile";
import { CtaMobile } from "@/components/mobile/CtaMobile";
import { FooterMobile } from "@/components/mobile/FooterMobile";
import { testimonials } from "@/lib/data";
import { getCategories, getHomeContent } from "@/lib/content";

/**
 * Desktop (1024px and up) follows the 1440 frame; below that the 393 mobile
 * frame takes over. Both layouts are in the DOM and swapped with CSS so the
 * page never re-renders on resize and anchors work on either.
 */
const D = "hidden lg:block";
const M = "lg:hidden";

export default async function Home() {
  const [{ trending, creators }, categories] = await Promise.all([getHomeContent(), getCategories()]);
  return (
    <main className="w-full overflow-x-clip bg-ink">
      <GradientDefs />
      <div id="top">
        <PageIntro>
          <div className={D}><Hero /></div>
          <div className={M}><HeroMobile /></div>
        </PageIntro>
      </div>
      <div id="workspace">
        <div className={D}><Workspace /></div>
        <div className={M}><WorkspaceMobile /></div>
      </div>
      <div id="category">
        <div className={D}><Category items={categories} /></div>
        <div className={M}><CategoryMobile items={categories} /></div>
      </div>
      <div id="trending">
        <div className={D}><Trending items={trending} /></div>
        <div className={M}><TrendingMobile items={trending} /></div>
      </div>
      <div id="how-it-works">
        <div className={D}><HowItWorks /></div>
        <div className={M}><HowItWorksMobile /></div>
      </div>
      <div id="features" className={D}><Features /></div>
      <div id="integrations" className={D}><Connect /></div>
      <div id="why">
        <div className={D}><WhyChooseUs /></div>
        <div className={M}><WhyChooseUsMobile /></div>
      </div>
      <div id="creators">
        <div className={D}><Creator items={creators} /></div>
        <div className={M}><CreatorMobile items={creators} /></div>
      </div>
      <div id="testimonials">
        <div className={D}><SocialProof items={testimonials} /></div>
        <div className={M}><SocialProofMobile items={testimonials} /></div>
      </div>
      <div id="pricing">
        <div className={D}><Pricing /></div>
        <div className={M}><PricingMobile /></div>
      </div>
      <div id="cta">
        <div className={D}><Cta /></div>
        <div className={M}><CtaMobile /></div>
      </div>
      <div id="about">
        <div className={D}><Footer /></div>
        <div className={M}><FooterMobile /></div>
      </div>
    </main>
  );
}
