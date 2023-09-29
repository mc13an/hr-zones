import {
  SubmitHandler,
  useFieldArray,
  useForm,
  Controller,
} from "react-hook-form";
import "./styles.css";
import { useEffect, useMemo, useState } from "react";
import { LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { curveStepAfter } from "@visx/curve";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Threshold } from "@visx/threshold";
import { isToday } from "date-fns";
import DatePicker from "react-datepicker";

import "react-datepicker/dist/react-datepicker.css";

interface HeartRateLimits {
  lowerLimit: string;
  upperLimit: string;
  startDate: Date;
}

interface FormValues {
  limits: HeartRateLimits[];
}

interface Resp extends Omit<HeartRateLimits, "startDate"> {
  startDate: string;
}

async function getZoneTwoLimits(): Promise<{ limits: Resp[] }> {
  const limits: Resp[] = [
    {
      lowerLimit: "138",
      upperLimit: "143",
      startDate: "2023-02-01",
    },
    {
      lowerLimit: "120",
      upperLimit: "127",
      startDate: "2023-04-10",
    },
    {
      lowerLimit: "130",
      upperLimit: "140",
      startDate: "2023-05-05",
    },
  ];
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve({ limits });
    }, 2000),
  );
}

const xScale = scaleTime<number>({
  range: [0, 575],
  domain: [new Date("2022-12-01"), new Date()],
});

const yScale = scaleLinear<number>({
  range: [175, 0],
  domain: [90, 180],
});

const addTodayToLine = (line: HeartRateLimits[]): HeartRateLimits => {
  const today = new Date();
  const lastEntry = line[line.length - 1];
  const data: HeartRateLimits = {
    ...lastEntry,
    startDate: today,
  };

  return data;
};

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [line, setLine] = useState<HeartRateLimits[]>([]);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setFocus,

    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: async () => {
      const resp = await getZoneTwoLimits();
      // const today = addTodayToLine(resp.limits);
      // setLine([...resp.limits, today]);
      setIsLoading(false);
      return {
        limits: resp.limits.map((limits) => ({
          ...limits,
          startDate: new Date(limits.startDate),
        })),
      };
    },
    mode: "onChange",
  });
  const { fields, append, remove, replace, move } = useFieldArray({
    name: "limits",
    control,
  });

  const onSubmit: SubmitHandler<FormValues> = (data, e) => {
    console.log("submit", data, e?.target);
    // const today = addTodayToLine(data.limits);
    // setLine([...data.limits, today]);
  };

  const addPeriod = () => {
    const last = line[line.length - 1];
    append({
      lowerLimit: last.lowerLimit,
      upperLimit: last.upperLimit,
      startDate: new Date(),
    });
  };

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      console.log("name", name, type, value);

      if (value?.limits) {
        const { limits } = value;
        let line: HeartRateLimits[];

        // If we are messing with start dates make sure the sort order is correct
        if (name?.includes("startDate")) {
          const index = name.split(".")[1];
          const editedInput = limits[parseInt(index, 10)];
          for (let i = 0; i < limits.length; i++) {
            // Don't evaluate if its the edited element - i think
            if (parseInt(index, 10) === i) {
              continue;
            }
            const element = limits[i];
            if (
              editedInput?.startDate &&
              element?.startDate &&
              editedInput?.startDate < element.startDate
            ) {
              console.log("move stuff");
              move(parseInt(index, 10), i);
              break;
              // setFocus(`limits.${i}.lowerLimit`);
            }
          }

          // const sorted = limits.sort((a, b) => {
          //   if (!a?.startDate || !b?.startDate) {
          //     return 0;
          //   }
          //
          //   if (a.startDate < b?.startDate) {
          //     return -1;
          //   } else if (a?.startDate > b?.startDate) {
          //     return 1;
          //   }
          //   return 0;
          // });
          // line = sorted as HeartRateLimits[];
          // replace(sorted as HeartRateLimits[]);
        } else {
          line = limits as HeartRateLimits[];
        }

        // const lastEntry = limits[limits.length - 1];
        // if (lastEntry?.startDate && isToday(lastEntry.startDate)) {
        //   setLine(line);
        // } else {
        //   const today = addTodayToLine(limits as HeartRateLimits[]);
        //   setLine([...line, today]);
        // }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, errors, replace]);

  const computedLine = useMemo(() => {
    console.log("recompute");
    return [...fields, addTodayToLine(fields)];
  }, [fields]);

  console.log("fields", fields);
  return (
    <div className="App" style={{ paddingTop: 30 }}>
      <svg width={600} height={200} style={{ paddingBottom: 20 }}>
        <rect width={600} height={175} fill="#efefef" />
        <g transform="translate(20,0)">
          <LinePath<HeartRateLimits>
            curve={curveStepAfter}
            data={computedLine}
            x={(d) => xScale(d.startDate)}
            y={(d) => yScale(parseInt(d.upperLimit, 10))}
            stroke="orange"
            strokeWidth={1}
          />
          <LinePath<HeartRateLimits>
            curve={curveStepAfter}
            data={computedLine}
            x={(d) => xScale(d.startDate)}
            y={(d) => yScale(parseInt(d.lowerLimit, 10))}
            stroke="blue"
            strokeWidth={1}
          />
          <Threshold<HeartRateLimits>
            id="theshhold-chart"
            data={computedLine}
            x={(d) => xScale(d.startDate)}
            y0={(d) => yScale(parseInt(d.upperLimit, 10))}
            y1={(d) => yScale(parseInt(d.lowerLimit, 10))}
            clipAboveTo={200}
            clipBelowTo={0}
            belowAreaProps={{
              fill: "blue",
              fillOpacity: 0.4,
            }}
            curve={curveStepAfter}
          />
          <AxisBottom
            top={175}
            scale={xScale}
            orientation="bottom"
            hideTicks
            tickLabelProps={{}}
          />
          <AxisLeft
            numTicks={5}
            left={30}
            scale={yScale}
            hideAxisLine
            hideTicks
            hideZero
            tickTransform="translate(0,8)"
            labelOffset={300}
            // labelProps={{ textAnchor: "start" }}
          />
          <GridRows
            numTicks={5}
            width={575}
            scale={yScale}
            stroke="gray"
            strokeWidth={2}
          />
        </g>
      </svg>
      <form onSubmit={handleSubmit(onSubmit)}>
        {isLoading ? (
          <div>loading</div>
        ) : (
          fields.map((field, index) => {
            return (
              <section
                key={field.id}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <div>
                  {errors?.limits && errors.limits[index]?.startDate?.message}
                </div>

                <div>
                  <input
                    type="number"
                    {...register(`limits.${index}.lowerLimit`, {
                      required: true,
                    })}
                  />
                  <input
                    type="number"
                    {...register(`limits.${index}.upperLimit`, {
                      required: true,
                    })}
                  />
                  <Controller
                    control={control}
                    name={`limits.${index}.startDate`}
                    render={({ field }) => {
                      // console.log("field", field);
                      return (
                        <DatePicker
                          maxDate={new Date()}
                          onChange={field.onChange}
                          selected={field.value}
                        />
                      );
                    }}
                  />
                </div>
                <button onClick={() => remove(index)}>remove</button>
              </section>
            );
          })
        )}
        <div>
          <button type="button" onClick={addPeriod}>
            Add
          </button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
