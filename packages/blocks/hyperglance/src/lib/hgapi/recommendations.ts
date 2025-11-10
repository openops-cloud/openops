import { Property } from "@openops/blocks-framework";
import { HGAuth } from "../auth";
import { makePostRequest } from "../callRestApi";

export enum RECOMMENDATIONS {
  COMMITMENT = "Commitment Recommendations",
  COST_WASTAGE = "Cost Wastage Findings",
  RIGHT_SIZING = "Right Sizing Recommendations",
  SNC = "Security And Compliance Findings"
}
export function getRecommendationsProp () {
    return (
      Property.StaticDropdown({
        displayName: 'Recommendations Type',
        description: 'Fetch recommendations in regards to this type',
        required: true,
        options: {
          options: [
            { label: RECOMMENDATIONS.COMMITMENT, value: RECOMMENDATIONS.COMMITMENT},
            { label: RECOMMENDATIONS.COST_WASTAGE, value: RECOMMENDATIONS.COST_WASTAGE },
            { label: RECOMMENDATIONS.RIGHT_SIZING, value: RECOMMENDATIONS.RIGHT_SIZING },
            { label: RECOMMENDATIONS.SNC, value: RECOMMENDATIONS.SNC },
          ],
        },
      })
    );
}

type dataType = {
      resourceType ?: {
        datasource: string;
        type: string;
      },
      recommendation: RECOMMENDATIONS
    };


    export async function fetchRecommendations(auth : HGAuth, data:dataType) {
        const body = {
            showCommitmentRecommendations : data.recommendation === RECOMMENDATIONS.COMMITMENT, 
            showCostWastageFindings : data.recommendation === RECOMMENDATIONS.COST_WASTAGE, 
            showRightSizingRecommendations : data.recommendation === RECOMMENDATIONS.RIGHT_SIZING, 
            showSecurityAndComplianceFindings: data.recommendation === RECOMMENDATIONS.SNC,
            resourceType : data.resourceType?.type
        };
        return await makePostRequest(auth.instanceUrl+"/hgapi/recommendations/list", auth.authToken, body);
    }
