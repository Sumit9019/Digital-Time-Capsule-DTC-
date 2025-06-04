import React from "react";
import { TooltipProvider, Tooltip } from "react-tooltip";

export default function TooltipTest() {
  return (
    <TooltipProvider>
      <div>
        <button data-tooltip-id="test-tooltip">Hover me</button>
        <Tooltip id="test-tooltip">This is a test tooltip</Tooltip>
      </div>
    </TooltipProvider>
  );
}
// This component demonstrates the use of tooltips using the react-tooltip library.