import 'server-only';

import { getAuthorizationContext } from '@/lib/auth/authorization';
import { WorkspaceService } from '@/lib/services/workspace-service';
import { getProductTerminology } from '@/lib/products/terminology';

export async function getCurrentProductTerminology() {
  const authorization = await getAuthorizationContext();
  const workspace = await WorkspaceService.getWorkspaceConfig(
    authorization.organizationId,
    authorization.userId
  );
  return getProductTerminology(
    workspace?.businessType,
    workspace?.businessCategory
  );
}
