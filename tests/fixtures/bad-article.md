# Resetting Your VPN Token

In this article, we will walk through the background you need before you attempt anything on your own, because the remote-access landscape at Contoso has changed a great deal over the past year, and a number of the older self-service portals that employees relied on for many years have been retired, consolidated, or renamed along the way, which is why so many people find themselves unsure of where to go when their credentials stop working on a Monday morning. Security policies are reviewed on a rolling basis, the help desk currently receives a very high volume of remote-access tickets, and the queue grows even longer during the quarterly certificate rotations, so the fastest path back to a working connection is usually to read everything below carefully before opening a new request with the service desk. Multi-Factor Authentication (MFA) is enforced for every remote session at Contoso, and enrollment is handled by the identity team rather than by the network team, which surprises people who joined before the two teams were separated.

The remote-access program was migrated to the latest release of the gateway software during the spring maintenance window, and the migration changed several of the screens that the older documentation still shows. As mentioned above, the older portals were retired, so bookmarks that worked last quarter may now redirect you to pages that no longer exist. Session certificates are also rotated on a faster cadence than before, which affects laptops that have not restarted in several weeks.

Additionally, the certificate authority that signs the VPN gateway was replaced during the same maintenance window, so older machines may show a trust warning until they pick up the new chain from the management agent, and a small number of devices will need a manual certificate refresh from the self-service catalog before the warning clears.

You can also request a temporary hardware token from the security office while you wait for a reset, although the approval workflow runs through a different queue and can take up to two business days, so plan ahead if you travel frequently or if you work from a site with unreliable mobile coverage.

Before you begin, make sure you have your employee ID, access to your registered phone, and your corporate mailbox open in another window, and confirm that your manager has approved remote access for your role this quarter, because the request form will ask for the approval reference number.

1. Sign in to the identity portal with your employee ID.
2. Select Security devices, and then select Reset token.
3. Approve the confirmation prompt that appears on your registered phone.
4. Wait for the confirmation email, and then reconnect to the VPN.

If the reset fails, collect the exact error code shown on the screen before you contact support, and note the time of the attempt.

This causes confusion when tickets arrive without details, because the first thing an agent will do is ask for the error code, and the ticket simply bounces back to you while the queue keeps moving.

### Notes

However, the process is different for contractors, and none of the guidance written for employees applies to vendor accounts, because contractor identities live in a separate directory that the identity portal cannot see. Contractor tokens are issued by the vendor management office instead, and MFA enrollment for contractors is completed during onboarding rather than through the self-service portal, so a contractor who follows the employee steps will simply create a ticket that gets closed without action a few days later.

It takes about five minutes for a reset to propagate across every region, and resets triggered during a maintenance window can take twice as long to settle. Review the above before escalating to the network team, because most stuck resets are simply still propagating through the regions. See above for the standard reset steps if you have not yet tried them in order.

The hardware token behaves differently from the soft token in daily use, whereas the soft token refreshes itself automatically over the network whenever the codes drift, the hardware token must be re-synced by hand from the token menu when its clock falls behind. Compared to the soft token, the hardware token also has a much longer replacement lead time, while the soft token can be reissued by the help desk on the same day. In contrast, a lost hardware token triggers a security review before a replacement will even ship to your site.

First, open the authenticator app on your registered phone, then tap the re-sync option under the token menu, next enter the eight-digit code shown in the identity portal, after that wait for the green checkmark to appear beside the token name, and finally confirm that the drift warning has cleared from the connection client.

Support hours for token issues run from Monday to Saturday in most regions, and the queue is quietest early in the morning before the daily standup. Tickets opened without an error code are routinely returned to the requester, which adds a full business day to the resolution, so include the code, your employee ID, and the approximate time of the failed reset in your very first message to the team.
