import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { DEFAULT_TZ } from "../constants/timezone";

const dayjsSingleton = dayjs;

dayjsSingleton.extend(customParseFormat);
dayjsSingleton.extend(localizedFormat);
dayjsSingleton.extend(utc);
dayjsSingleton.extend(timezone);
dayjsSingleton.tz.setDefault(DEFAULT_TZ);

export { dayjsSingleton };
export default dayjsSingleton;
