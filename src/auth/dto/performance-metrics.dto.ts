export class PerformanceMetricsDto {
  applicationSuccessRate: number;
  totalEarnings: number;
  topSkills: string[];
  skillDemand: Record<string, number>;
  earningsOverTime: number[];
  profileViews: number;
  comparisonToAverage?: number;
}
