import { TimezoneBar } from "./tz-bar";

const Navbar = () => {
  return (
    <div className="flex justify-center gap-2 py-2 shadow-sm">
      <TimezoneBar />
    </div>
  );
};

export default Navbar;
