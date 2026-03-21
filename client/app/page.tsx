import Image from "next/image";
import { Loading } from "@/shared/ui/loading/loading";
import { Error } from "@/widgets/error/error";
import { NavBar } from "@/shared/layout/NavBar/NavBar";
import SpinPage from "./(main)/game/(pages)/spin/page";
import { redirect } from "next/navigation";

export default function Home() {
  //redirect to spin page
  redirect('/game/spin');
  return (
    <div >
     {/* <Error errorSubText="Error Text" errorText="Error SubText"/>
     <Loading/> */}
      <Loading/>
    </div>
  );
}
