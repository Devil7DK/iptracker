import "./Entries.scss";

import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dot,
  DotProps,
  LabelProps,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { Socket, io } from "socket.io-client";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { EntryAttributes } from "../../common";
import { useDependantState } from "../Utils";

interface IProps {
  min: number;
  max: number;
}

interface ICustomDotProps extends DotProps {
  payload?: EntryAttributes;
  legendMap: Record<string, string>;
}

const legendColors = [
  "#619ED6",
  "#6BA547",
  "#F7D027",
  "#E48F1B",
  "#B77EA3",
  "#E64345",
  "#60CEED",
  "#9CF168",
  "#F7EA4A",
  "#FBC543",
  "#FFC9ED",
  "#E6696E",
];

const CustomDot: React.FC<ICustomDotProps> = (props) => {
  const ip = (props as any).payload?.ip;
  const legendMap = (props as any).legendMap;

  return <Dot {...props} r={5} fill={legendMap[ip] || "#8884d8"} />;
};

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = (props) => {
  if (props.active && Array.isArray(props.payload) && props.payload.length) {
    const item = props.payload[0].payload as EntryAttributes;

    return (
      <div className="entry-cutom-tooltip-grid">
        <div className="title">IP</div>
        <div className="value">{item.ip}</div>
        <div className="title">Changed After</div>
        <div className="value">{item.changedAfter} ms</div>
        <div className="title">Timestamp</div>
        <div className="value">
          {dayjs(item.timestamp).format("YYYY-MM-DD HH:mm:ss A")}
        </div>
        <div className="title">Last Updated</div>
        <div className="value">
          {dayjs(item.lastUpdated).format("YYYY-MM-DD HH:mm:ss A")}
        </div>
      </div>
    );
  }

  return null;
};
export const Entries: React.FC<IProps> = ({
  min: minTimestamp,
  max: maxTimestamp,
}) => {
  const minDate = useMemo(
    () => dayjs(minTimestamp).format("YYYY-MM-DD"),
    [minTimestamp]
  );
  const maxDate = useMemo(
    () => dayjs(maxTimestamp).format("YYYY-MM-DD"),
    [maxTimestamp]
  );

  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useDependantState<string>(() => minDate, [minDate]);
  const [to, setTo] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryAttributes[]>([]);

  const { legends, legendMap } = useMemo(() => {
    const legends = entries
      .reduce<string[]>((acc, entry) => {
        if (!acc.includes(entry.ip)) {
          acc.push(entry.ip);
        }

        return acc;
      }, [])
      .map((ip, index) => ({ label: ip, color: legendColors[index] }));

    const legendMap = entries.reduce<Record<string, string>>((acc, entry) => {
      acc[entry.ip] =
        legendColors[legends.findIndex((legend) => legend.label === entry.ip)];

      return acc;
    }, {});

    return { legends, legendMap };
  }, [entries]);

  const xAxisFormat = useMemo(() => {
    const fromDate = dayjs(from);
    const toDate = dayjs(to);

    const diffInDays = toDate.diff(fromDate, "day");

    if (diffInDays > 0) {
      return "YYYY-MM-DD HH:mm:ss A";
    } else {
      return "HH:mm:ss A";
    }
  }, [from, to]);

  useEffect(() => {
    let socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;

    const abortController = new AbortController();

    setLoading(true);

    axios
      .post<EntryAttributes[]>(
        "/api/entries",
        {
          from: dayjs(from).startOf("day").valueOf(),
          to: to ? dayjs(to).endOf("day").valueOf() : undefined,
        },
        {
          signal: abortController.signal,
        }
      )
      .then((response) => {
        if (Array.isArray(response.data)) {
          setEntries(response.data.map((item) => ({ ...item, value: 0 })));

          if (!to) {
            socket = io({ autoConnect: false });

            socket.on("new_entry", (newEntry) => {
              setEntries((entries) => [...entries, newEntry]);
            });

            socket.on("update_entry", (updatedEntry) => {
              setEntries((entries) =>
                entries.map((entry) =>
                  entry.id === updatedEntry.id ? updatedEntry : entry
                )
              );
            });

            socket.connect();
          }
        } else {
          throw new Error("Invalid data!");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch entries!", error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      abortController.abort();

      if (socket) {
        socket.disconnect();
      }
    };
  }, [from, to]);

  return (
    <div className="entries-grid">
      <div className="filters-bar">
        <div className="filters">
          <div className="filter">
            <label htmlFor="txtFrom">From:</label>
            <input
              id="txtFrom"
              type="date"
              min={minDate}
              max={maxDate}
              value={from}
              onChange={(e) => {
                setFrom(dayjs(e.target.valueAsDate).format("YYYY-MM-DD"));
              }}
            />
          </div>
          <div className="filter">
            <label htmlFor="txtTo">To:</label>
            <input
              id="txtTo"
              type="date"
              min={from}
              max={maxDate}
              value={to || ""}
              onChange={(e) => {
                setTo(dayjs(e.target.valueAsDate).format("YYYY-MM-DD"));
              }}
            />
            {to && (
              <span className="clear-icon" onClick={() => setTo(null)}>
                &#x1F5D9;
              </span>
            )}
          </div>
        </div>
        <div className="legends">
          {legends.map((legend) => (
            <div key={legend.label} className="legend">
              <div
                className="color"
                style={{ backgroundColor: legend.color }}
              ></div>
              <div className="label">{legend.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="content-container">
        {loading ? (
          <div className="loading-overlay">Loading...</div>
        ) : entries.length ? (
          <div className="chart-container">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={entries} margin={{ left: 50 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => dayjs(value).format(xAxisFormat)}
                  type="category"
                />

                <YAxis
                  dataKey="value"
                  domain={[-1, 1]}
                  label={
                    {
                      value: "Changed After (ms)",
                      angle: -90,
                      position: "insideLeft",
                      textAnchor: "middle",
                      dx: -40,
                    } as LabelProps
                  }
                />

                <Line
                  type="monotone"
                  dataKey="changedAfter"
                  stroke="#8884d8"
                  dot={<CustomDot legendMap={legendMap} />}
                />

                <Tooltip content={<CustomTooltip />} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="no-data-overlay">No data available!</div>
        )}
      </div>
    </div>
  );
};
