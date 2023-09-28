import { SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import "./styles.css";
import { useEffect, useState } from "react";
import { LinePath } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { curveStepAfter } from "@visx/curve";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { Threshold } from "@visx/threshold";
import { differenceInMinutes } from "date-fns";

interface HeartRateLimits {
  lowerLimit: string;
  upperLimit: string;
  startDate: string;
}

interface FormValues {
  limits: HeartRateLimits[];
}

async function getZoneTwoLimits(): Promise<FormValues> {
  const limits: HeartRateLimits[] = [
    {
      lowerLimit: "138",
      upperLimit: "143",
      startDate: "2023-02-01"
    },
    {
      lowerLimit: "120",
      upperLimit: "127",
      startDate: "2023-04-10"
    },
    {
      lowerLimit: "130",
      upperLimit: "140",
      startDate: "2023-05-05"
    }
  ];
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve({ limits });
    }, 2000)
  );
}

const xScale = scaleTime<number>({
  range: [0, 575],
  domain: [new Date("2022-12-01"), new Date()]
});

const yScale = scaleLinear<number>({
  range: [175, 0],
  domain: [90, 180]
});

const addTodayToLine = (line: HeartRateLimits[]): HeartRateLimits => {
  const today = new Date().toISOString().split("T")[0];
  const lastEntry = line[line.length - 1];
  const data: HeartRateLimits = {
    ...lastEntry,
    startDate: today
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

    formState: { errors }
  } = useForm<FormValues>({
    defaultValues: async () => {
      const resp = await getZoneTwoLimits();
      const today = addTodayToLine(resp.limits);
      setLine([...resp.limits, today]);
      setIsLoading(false);
      return resp;
    },
    mode: "onChange"
  });
  const { fields, append, remove, replace } = useFieldArray({
    name: "limits",
    control,
    rules: {
      validate: (value, values) => {
        console.log("validate", value, values);
        return true;
      }
    }
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
      startDate: new Date().toISOString().split("T")[0]
    });
  };

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      console.log("name", name, type, value);

      if (value?.limits) {
        const { limits } = value;
        const lastEntry = limits[limits.length - 1];
        const today = new Date().toISOString().split("T")[0];

        if (name?.includes("startDate")) {
          const sorted = limits.sort((a, b) => {
            if (
              new Date(a?.startDate as string) <
              new Date(b?.startDate as string)
            ) {
              return -1;
            } else if (
              new Date(a?.startDate as string) >
              new Date(b?.startDate as string)
            ) {
              return 1;
            }
            return 0;
          });
          replace(sorted as HeartRateLimits[]);
        }

        if (today === lastEntry?.startDate) {
          setLine(sorted as HeartRateLimits[]);
        } else {
          const today = addTodayToLine(limits as HeartRateLimits[]);
          setLine([...(sorted as HeartRateLimits[]), today]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, errors, replace]);

  // console.log("errors", errors);

  return (
    <div className="App" style={{ paddingTop: 30 }}>
      <svg width={600} height={200} style={{ paddingBottom: 20 }}>
        <rect width={600} height={175} fill="#efefef" />
        <g transform="translate(20,0)">
          <LinePath<HeartRateLimits>
            curve={curveStepAfter}
            data={line}
            x={(d) => xScale(new Date(d.startDate))}
            y={(d) => yScale(parseInt(d.upperLimit, 10))}
            stroke="orange"
            strokeWidth={1}
          />
          <LinePath<HeartRateLimits>
            curve={curveStepAfter}
            data={line}
            x={(d) => xScale(new Date(d.startDate))}
            y={(d) => yScale(parseInt(d.lowerLimit, 10))}
            stroke="blue"
            strokeWidth={1}
          />
          <Threshold<HeartRateLimits>
            id="theshhold-chart"
            data={line}
            x={(d) => xScale(new Date(d.startDate))}
            y0={(d) => yScale(parseInt(d.upperLimit, 10))}
            y1={(d) => yScale(parseInt(d.lowerLimit, 10))}
            clipAboveTo={200}
            clipBelowTo={0}
            belowAreaProps={{
              fill: "blue",
              fillOpacity: 0.4
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
              <section key={field.id}>
                <div>
                  {errors?.limits && errors.limits[index]?.startDate?.message}
                </div>
                <input
                  type="number"
                  {...register(`limits.${index}.lowerLimit`, {
                    required: true
                  })}
                />
                <input
                  type="number"
                  {...register(`limits.${index}.upperLimit`, {
                    required: true
                  })}
                />
                <input
                  type="date"
                  {...register(`limits.${index}.startDate`, {
                    required: true,

                    validate: (v, { limits }) => {
                      const index = limits.findIndex(
                        ({ startDate }) => startDate === v
                      );
                      const previous = limits[index - 1];
                      if (
                        previous &&
                        new Date(previous.startDate) > new Date(v)
                      ) {
                        return "start date cannot be before previous period";
                      }
                      return true;
                    }
                  })}
                />
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
