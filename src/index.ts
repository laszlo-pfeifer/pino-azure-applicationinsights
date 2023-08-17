import { setup, defaultClient, Contracts } from "applicationinsights";
import build from "pino-abstract-transport";
import { match } from "ts-pattern";

const getSeverityLevel = (item: any) => {
  return match(item.level)
    .with(10, () => Contracts.SeverityLevel.Verbose)
    .with(20, () => Contracts.SeverityLevel.Verbose)
    .with(40, () => Contracts.SeverityLevel.Warning)
    .with(50, () => Contracts.SeverityLevel.Error)
    .with(60, () => Contracts.SeverityLevel.Critical)
    .otherwise(() => Contracts.SeverityLevel.Information);
};

const trackException = (item: any) => {
  const err = new Error(item.msg);
  err.stack = item.stack || item.err?.stack || "";

  defaultClient.trackException({
    exception: err,
  });
};

const trackTrace = (item: any) => {
  const props = Object.assign({}, item);
  delete props.msg;
  defaultClient.trackTrace({
    message: item.msg,
    severity: getSeverityLevel(item),
    properties: props,
  });
};

export default async function (opts: { instrumentationKey: string }) {
  if (!opts || !opts.instrumentationKey) {
    throw new Error("instrumentationKey is required");
  }
  setup(opts.instrumentationKey).start();
  return build(
    async function (source) {
      for await (const obj of source) {
        if (obj.level >= 50) {
          trackException(obj);
        }
        trackTrace(obj);
      }
    },
    {
      async close(err) {
        console.log("close", err);
      },
    }
  );
}
