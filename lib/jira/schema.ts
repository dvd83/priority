import { z } from "zod";

/**
 * Validation des réponses Jira. Les schémas sont volontairement tolérants
 * (champs optionnels / nullables) car le contenu dépend de la configuration
 * de l'instance, mais tout ce qui est utilisé est vérifié.
 */

const userSchema = z
  .object({
    accountId: z.string().optional(), // Cloud
    name: z.string().optional(), // Data Center
    key: z.string().optional(), // Data Center
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
  })
  .nullable()
  .optional();

const namedSchema = z.object({ name: z.string() }).nullable().optional();

export const issueFieldsSchema = z
  .object({
    summary: z.string().nullable().optional(),
    description: z.unknown().optional(),
    priority: namedSchema,
    status: z
      .object({
        name: z.string(),
        statusCategory: z.object({ key: z.string().optional() }).nullable().optional(),
      })
      .nullable()
      .optional(),
    assignee: userSchema,
    reporter: userSchema,
    created: z.string().nullable().optional(),
    updated: z.string().nullable().optional(),
    duedate: z.string().nullable().optional(),
    issuetype: namedSchema,
    project: z.object({ key: z.string(), name: z.string().optional() }).nullable().optional(),
    labels: z.array(z.string()).nullable().optional(),
    components: z.array(z.object({ name: z.string() })).nullable().optional(),
  })
  .catchall(z.unknown());

export const issueSchema = z.object({
  id: z.string().optional(),
  key: z.string().regex(/^[A-Z][A-Z0-9_]*-\d+$/, "clé Jira invalide"),
  fields: issueFieldsSchema,
});

export type RawIssue = z.infer<typeof issueSchema>;

/** Page de recherche — Cloud (/search/jql, pagination par jeton). */
export const cloudSearchPageSchema = z.object({
  issues: z.array(z.unknown()),
  nextPageToken: z.string().nullable().optional(),
  isLast: z.boolean().optional(),
});

/** Page de recherche — Data Center (/search, pagination par offset). */
export const dcSearchPageSchema = z.object({
  issues: z.array(z.unknown()),
  startAt: z.number().optional(),
  maxResults: z.number().optional(),
  total: z.number().optional(),
});
