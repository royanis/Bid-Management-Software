// src/context/WorkshopContext.js
import React, { createContext, useState, useContext } from 'react';

const WorkshopContext = createContext();

export const useWorkshopContext = () => useContext(WorkshopContext);

export const WorkshopProvider = ({ children }) => {
  const [activeStep, setActiveStep] = useState(0); // Initialize to step 0

  const value = {
    activeStep,
    setActiveStep,
  };

  return (
    <WorkshopContext.Provider value={value}>
      {children}
    </WorkshopContext.Provider>
  );
};