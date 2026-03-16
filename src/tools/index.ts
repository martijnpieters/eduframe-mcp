import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAccountTools } from "./accounts";
import { registerAffiliationTools } from "./affiliations";
import { registerAttendanceTools } from "./attendances";
import { registerAuthenticationTools } from "./authentications";
import { registerCatalogProductTools } from "./catalog_products";
import { registerCatalogVariantTools } from "./catalog_variants";
import { registerCategorieTools } from "./categories";
import { registerCertificateTools } from "./certificates";
import { registerCommentTools } from "./comments";
import { registerCourseLocationTools } from "./course_locations";
import { registerCourseTabTools } from "./course_tabs";
import { registerCourseVariantTools } from "./course_variants";
import { registerCourseTools } from "./courses";
import { registerCreditCategorieTools } from "./credit_categories";
import { registerCreditTools } from "./credits";
import { registerCustomAssociationTools } from "./custom_associations";
import { registerCustomFieldOptionTools } from "./custom_field_options";
import { registerCustomObjectTools } from "./custom_objects";
import { registerCustomRecordTools } from "./custom_records";
import { registerDiscountCodeTools } from "./discount_codes";
import { registerEditionDescriptionSectionTools } from "./edition_description_sections";
import { registerEducatorTools } from "./educators";
import { registerEmailTools } from "./emails";
import { registerEnrollmentTools } from "./enrollments";
import { registerGradeTools } from "./grades";
import { registerInvoiceVatTools } from "./invoice_vats";
import { registerInvoiceTools } from "./invoices";
import { registerLabelTools } from "./labels";
import { registerLeadTools } from "./leads";
import { registerMaterialGroupTools } from "./material_groups";
import { registerMaterialTools } from "./materials";
import { registerMeetingLocationTools } from "./meeting_locations";
import { registerMeetingTools } from "./meetings";
import { registerOrderTools } from "./orders";
import { registerOrganizationTools } from "./organizations";
import { registerPaymentMethodTools } from "./payment_methods";
import { registerPaymentOptionTools } from "./payment_options";
import { registerPaymentTools } from "./payments";
import { registerPlannedCourseTools } from "./planned_courses";
import { registerPlanningAttendeeTools } from "./planning_attendees";
import { registerPlanningConflictTools } from "./planning_conflicts";
import { registerPlanningEventTools } from "./planning_events";
import { registerPlanningLocationTools } from "./planning_locations";
import { registerPlanningMaterialTools } from "./planning_materials";
import { registerPlanningRequiredTeacherGroupAttendeeTools } from "./planning_required_teacher_group_attendees";
import { registerPlanningTeacherTools } from "./planning_teachers";
import { registerProgramEditionTools } from "./program_editions";
import { registerProgramElementTools } from "./program_elements";
import { registerProgramEnrollmentTools } from "./program_enrollments";
import { registerProgramPersonalProgramElementTools } from "./program_personal_program_elements";
import { registerProgramProgramTools } from "./program_programs";
import { registerReferralTools } from "./referrals";
import { registerSignupQuestionTools } from "./signup_questions";
import { registerTaskTools } from "./tasks";
import { registerTeacherEnrollmentTools } from "./teacher_enrollments";
import { registerTeacherRoleTools } from "./teacher_roles";
import { registerTeacherTools } from "./teachers";
import { registerTheseTools } from "./theses";
import { registerUserTools } from "./users";
import { registerWebhookNotificationTools } from "./webhook_notifications";
import { registerWebhookTools } from "./webhooks";

const tools: Array<(server: McpServer) => void> = [
  registerAccountTools,
  registerAffiliationTools,
  registerAttendanceTools,
  registerAuthenticationTools,
  registerCatalogProductTools,
  registerCatalogVariantTools,
  registerCategorieTools,
  registerCertificateTools,
  registerCommentTools,
  registerCourseLocationTools,
  registerCourseTabTools,
  registerCourseVariantTools,
  registerCourseTools,
  registerCreditCategorieTools,
  registerCreditTools,
  registerCustomAssociationTools,
  registerCustomFieldOptionTools,
  registerCustomObjectTools,
  registerCustomRecordTools,
  registerDiscountCodeTools,
  registerEditionDescriptionSectionTools,
  registerEducatorTools,
  registerEmailTools,
  registerEnrollmentTools,
  registerGradeTools,
  registerInvoiceVatTools,
  registerInvoiceTools,
  registerLabelTools,
  registerLeadTools,
  registerMaterialGroupTools,
  registerMaterialTools,
  registerMeetingLocationTools,
  registerMeetingTools,
  registerOrderTools,
  registerOrganizationTools,
  registerPaymentMethodTools,
  registerPaymentOptionTools,
  registerPaymentTools,
  registerPlannedCourseTools,
  registerPlanningAttendeeTools,
  registerPlanningConflictTools,
  registerPlanningEventTools,
  registerPlanningLocationTools,
  registerPlanningMaterialTools,
  registerPlanningRequiredTeacherGroupAttendeeTools,
  registerPlanningTeacherTools,
  registerProgramEditionTools,
  registerProgramElementTools,
  registerProgramEnrollmentTools,
  registerProgramPersonalProgramElementTools,
  registerProgramProgramTools,
  registerReferralTools,
  registerSignupQuestionTools,
  registerTaskTools,
  registerTeacherEnrollmentTools,
  registerTeacherRoleTools,
  registerTeacherTools,
  registerTheseTools,
  registerUserTools,
  registerWebhookNotificationTools,
  registerWebhookTools,
];

export function registerAllTools(server: McpServer): void {
  for (const register of tools) {
    register(server);
  }
}
