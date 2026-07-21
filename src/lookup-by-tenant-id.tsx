import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, type LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isTenantId, lookupConsumerTenant, type TenantResult } from "./lib/tenant";
import { authorize, logout } from "./lib/auth";
import { findTenantById, type TenantInfo } from "./lib/graph";
import { useHistory } from "./lib/history";
import { TenantListItem } from "./components/tenant-list-item";

function infoToResult(info: TenantInfo): TenantResult {
  return {
    input: info.tenantId,
    domain: info.defaultDomainName ?? info.tenantId,
    tenantId: info.tenantId,
    brandName: info.displayName || info.federationBrandName || undefined,
    cloud: "commercial",
    cloudLabel: "Commercial",
  };
}

export default function LookUpByTenantId(
  props: LaunchProps<{ arguments: Arguments.LookupByTenantId }>,
) {
  const initial = (props.arguments?.query || props.fallbackText || "").trim();
  const [searchText, setSearchText] = useState(initial);
  const query = searchText.trim();
  const valid = isTenantId(query);
  // Well-known consumer (personal-account) tenants resolve locally, with no sign-in.
  const consumer = valid ? lookupConsumerTenant(query) : undefined;

  const { record } = useHistory();

  const { data, isLoading } = useCachedPromise(
    async (tenantId: string): Promise<TenantResult> => {
      try {
        // Sign in lazily — only when a non-consumer ID actually needs Microsoft Graph.
        const token = await authorize();
        return infoToResult(await findTenantById(token, tenantId));
      } catch (error) {
        return {
          input: tenantId,
          domain: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [query],
    {
      execute: valid && !consumer,
      keepPreviousData: true,
      onData: (result) => {
        if (result.tenantId) void record([result]);
      },
    },
  );

  const result = consumer ?? data;
  const hasResult = valid && !!result?.tenantId;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste a tenant ID (GUID)"
      isShowingDetail={hasResult}
      throttle
    >
      {!valid ? (
        <List.EmptyView
          icon={{ source: Icon.Fingerprint, tintColor: Color.Blue }}
          title={
            query.length === 0 ? "Look up a tenant by its ID" : "That doesn't look like a tenant ID"
          }
          description="Paste a tenant GUID like 72f988bf-86f1-41af-91ab-2d7cd011db47 to reveal its organization name and default domain. Personal-account tenant IDs are recognized instantly; other IDs prompt a work or school sign-in."
          actions={
            <ActionPanel>
              <Action
                title="Sign out"
                icon={Icon.Logout}
                style={Action.Style.Destructive}
                onAction={() => logout()}
              />
            </ActionPanel>
          }
        />
      ) : result ? (
        <TenantListItem result={result} />
      ) : null}
    </List>
  );
}
