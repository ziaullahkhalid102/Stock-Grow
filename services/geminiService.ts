
// AI Service has been disabled. Returning manual insights.

export const getMarketInsights = async (
  totalUsers: number, 
  totalVolume: number, 
  topPlans: {name: string, count: number}[]
): Promise<string> => {
  
  // Static manual messages
  const messages = [
    "Market volume is reaching new highs! Invest now to secure your profit.",
    "Bulls are in control. Liquidity is high across all sectors. 🚀",
    "Stable growth detected. Consistent returns observed in Gold and Diamond plans.",
    "High demand for short-term plans. Don't miss the opportunity! 📈"
  ];

  return messages[Math.floor(Math.random() * messages.length)];
};
