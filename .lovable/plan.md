# Update professional setup price

## Changes
- Update the setup checkout to €570, store 57000 cents explicitly, and apply or create Stripe’s inclusive Italian 22% IVA tax rate.
- Add a database migration changing only the default for future `setup_requests` rows to 57000 cents.
- Remove the IVA suffix from the setup payment notification email.
- Replace all visible setup-service €500 labels with the requested bilingual €570 wording.

## Validation
- Search for remaining old setup price labels without altering unrelated 500-item limits.
- Deploy the two changed functions and verify the project build and relevant public pages.
