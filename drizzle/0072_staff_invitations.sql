CREATE TABLE "staff_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organizationId" text NOT NULL,
	"employeeId" text NOT NULL,
	"branchId" text NOT NULL,
	"userId" text,
	"email" text NOT NULL,
	"tokenHash" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdBy" text NOT NULL,
	"acceptedAt" timestamp,
	"revokedAt" timestamp,
	"supersededAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_invitation_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_organizationId_organization_id_fk" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_employeeId_employee_id_fk" FOREIGN KEY ("employeeId") REFERENCES "public"."employee"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_branchId_branch_id_fk" FOREIGN KEY ("branchId") REFERENCES "public"."branch"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_invitation" ADD CONSTRAINT "staff_invitation_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "staff_invitation_org_idx" ON "staff_invitation" USING btree ("organizationId");
--> statement-breakpoint
CREATE INDEX "staff_invitation_employee_idx" ON "staff_invitation" USING btree ("employeeId");
--> statement-breakpoint
CREATE INDEX "staff_invitation_pending_idx" ON "staff_invitation" USING btree ("status", "expiresAt");
