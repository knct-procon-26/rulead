import { Alert } from "react-native";
import { api } from "./client";

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
        { text: "キャンセル", style: "cancel", onPress: () => resolve(null) },
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
  Alert.alert(
    ok ? "報告しました" : "報告できませんでした",
    !ok
      ? "通信できる場所で、もう一度お試しください。"
      : ruleId !== undefined
        ? "ご協力ありがとうございます。同じ報告が複数の人から届くと、この公園ではこのルールが表示されなくなります（反映まで最大1日かかります）。"
        : "ご協力ありがとうございます。",
  );
}

export async function promptReportRule(
  parkId: number,
  ruleId: string,
  ruleText: string,
): Promise<void> {
  const reason = await chooseReason(
    "このルールを報告",
    `「${ruleText}」\n\nどのような問題がありますか？`,
    [
      { label: "この公園にない", reason: "rule_not_here" },
      { label: "内容がおかしい", reason: "rule_inappropriate" },
    ],
  );
  if (reason === null) return;
  await sendAndTell(reason, ruleId, parkId);
}

export async function promptReportPark(
  parkId: number,
  parkName: string,
): Promise<void> {
  const reason = await chooseReason(
    "この公園を報告",
    `「${parkName || "名前のない公園"}」\n\n公園の名前や場所が違いますか？`,
    [{ label: "名前・場所が違う", reason: "park_wrong" }],
  );
  if (reason === null) return;
  await sendAndTell(reason, undefined, parkId);
}
