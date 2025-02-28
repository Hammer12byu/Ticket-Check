import { Nav } from "../components/Nav";
// import cloud from "../assets/cloud-rain-alt-1-svgrepo-com.svg";
import EventForm from "../components/EventForm";


export function Landing() {
  return (
    <div>
      <Nav />
      <h1>Ticket Monitor</h1>
      <EventForm />
    </div>
  );
}