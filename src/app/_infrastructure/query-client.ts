import { createQueryClient } from "@/shared/query/create-query-client";
import { configureQueryClient } from "@/shared/query/query-client";
import { queryPersister } from "./query-persistence";

export const queryClient = createQueryClient(queryPersister.persisterFn);

configureQueryClient(queryClient);
