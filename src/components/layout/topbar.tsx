import { forwardRef, RefObject, useRef } from "react";
import LocaleSwitcher from "../locale-switcher";

const Topbar = () => {
  return (
    <header className="sticky w-full flex border-b">
      <div className="w-full flex px-10 py-3">
        <div className="ml-auto flex flex-row items-center gap-2">
          <p>Edit language</p>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
};
export default Topbar;
