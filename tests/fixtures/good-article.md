# Reset your VPN token

Reset your VPN token from the identity portal whenever your six-digit codes stop working. A reset takes about five minutes end to end and requires your registered phone. Employees use the identity portal; contractors request resets from the vendor management office.

## Reset a soft token in the identity portal

Follow these steps to reset a soft token:

1. Sign in to the identity portal with your employee ID.
2. Select Security devices, and then select Reset token.
3. Approve the confirmation prompt on your registered phone.
4. Wait for the confirmation email, and then reconnect to the VPN.

If the reset fails, note the exact error code on the screen and include it when you contact support. Tickets that include the error code are resolved about a business day faster than tickets without one.

## Enroll in multi-factor authentication

Enroll in multi-factor authentication (MFA) before your first token reset. MFA enrollment is handled by the identity team: open the identity portal, select Security devices, and register your phone. Every remote session at Contoso requires MFA, so complete enrollment on your first day if you can.

## Hardware token vs. soft token

Choose a token type based on how you work. The table below compares the two options.

| Feature | Soft token | Hardware token |
| --- | --- | --- |
| Code refresh | Automatic, over the network | Manual re-sync from the token menu |
| Replacement time | Same day, from the help desk | Several days, after a security review |
| Best for | Most employees | Sites with unreliable mobile coverage |

## Re-sync a hardware token

Re-sync a hardware token whenever its codes stop being accepted, which usually means its clock has drifted:

1. Open the authenticator app on your registered phone.
2. Tap the re-sync option under the token menu.
3. Enter the eight-digit code shown in the identity portal.
4. Wait for the green checkmark beside the token name.
5. Confirm that the drift warning has cleared from the connection client.

## Reset a contractor or vendor token

Contractors request token resets from the vendor management office, not the identity portal, because contractor identities live in a separate directory. Contractors complete multi-factor authentication enrollment during onboarding. A contractor who follows the employee steps will create a ticket that is closed without action, so route vendor requests to the vendor management office queue from the start.

## Troubleshoot a reset that has not propagated

A reset propagates to every region within about five minutes, and up to ten minutes during a maintenance window. If your codes still fail after ten minutes, restart the connection client, and then check the token status page in the identity portal. Open a ticket only after the status page shows an error, and include the error code, your employee ID, and the time of the failed reset.
