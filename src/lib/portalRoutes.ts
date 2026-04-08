export function dashboardPath(role: string): string {
  if (role === "contractor") return "/contractor/dashboard";
  if (role === "admin") return "/admin";
  return "/client/dashboard";
}
