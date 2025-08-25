import Cat from "@/component/Cat";
import Deal from "@/component/Deal";
import Hero from "@/component/Hero";
import New from "@/component/New";


export default function Home() {
  return (
    <>
    <Hero />
    <div className="bg-gradient-to-br from-red-50 to-orange-50">
    <Deal />
    <Cat />
    <New />
    </div>
    
    
    </>
  );
}
