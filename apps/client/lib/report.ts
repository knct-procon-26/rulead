import { Alert } from "react-native";
import { api } from "./client";
import { getT } from "./i18n";

export type ReportReason =
  | "rule_not_here"
  | "rule_inappropriate"
  | "park_wrong";

export async function report(
  reason: ReportReason,
  ruleId?: string,
  parkId?: number,
): Promise<boolean> {
  try {
    const res = await api.api.report.$post({
      json: { reason, ruleId: ruleId ?? null, parkId: parkId ?? null },
    });
    return res.ok;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

type Choice = { label: string; reason: ReportReason };

function chooseReason(
  title: string,
  message: string,
  choices: [Choice] | [Choice, Choice],
): Promise<ReportReason | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: getT().common.cancel, style: "cancel", onPress: () => resolve(null) },
        ...choices.map((c) => ({
          text: c.label,
          style: "destructive" as const,
          onPress: () => resolve(c.reason),
        })),
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

async function sendAndTell(
  reason: ReportReason,
  ruleId: string | undefined,
  parkId: number,
): Promise<void> {
  const ok = await report(reason, ruleId, parkId);
  const t = getT();
  Alert.alert(
    ok ? t.report.sent : t.report.failed,
    !ok
      ? t.common.tryAgainOnline
      : ruleId !== undefined
        ? t.report.thanksRule
        : t.report.thanks,
  );
}

export async function promptReportRule(
  parkId: number,
  ruleId: string,
  ruleText: string,
): Promise<void> {
  const t = getT();
  const reason = await chooseReason(
    t.report.ruleTitle,
    t.report.ruleMessage(ruleText),
    [
      { label: t.report.ruleNotHere, reason: "rule_not_here" },
      { label: t.report.ruleInappropriate, reason: "rule_inappropriate" },
    ],
  );
  if (reason === null) return;
  await sendAndTell(reason, ruleId, parkId);
}

export async function promptReportPark(
  parkId: number,
  parkName: string,
): Promise<void> {
  const t = getT();
  const reason = await chooseReason(
    t.report.parkTitle,
    t.report.parkMessage(parkName || t.common.unnamedPark),
    [{ label: t.report.parkWrong, reason: "park_wrong" }],
  );
  if (reason === null) return;
  await sendAndTell(reason, undefined, parkId);
}
