import "./App.scss";

import axios from "axios";
import React, { useEffect, useState } from "react";

import { Entries } from "./Entries";

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [minMax, setMinMax] = useState<{ min: number; max: number } | null>(
    null
  );

  useEffect(() => {
    const abortController = new AbortController();

    setLoading(true);

    axios
      .get("/api/available-dates", { signal: abortController.signal })
      .then((response) => {
        if (response.data) {
          setMinMax(response.data);
        } else {
          throw new Error("No data available!");
        }
      })
      .catch((error) => {
        console.error("Failed to load available dates!", error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <>
      <h1>IP Tracker</h1>
      <div className="app">
        {loading ? (
          <div className="loading-overlay">Loading...</div>
        ) : minMax ? (
          <Entries {...minMax} />
        ) : (
          <div className="no-data-overlay">No data available!</div>
        )}
      </div>
    </>
  );
};
