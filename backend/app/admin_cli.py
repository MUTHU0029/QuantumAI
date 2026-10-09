import click
from flask import current_app
from pymongo.errors import DuplicateKeyError, PyMongoError

from .users import (
    InputValidationError,
    create_user,
    ensure_user_indexes,
    normalize_email,
    validate_name,
    validate_password,
)


def register_admin_command(app):
    @app.cli.command("create-admin")
    def create_admin():
        """Create the single initial administrator from a local terminal."""
        email_input = click.prompt("Administrator email")
        name = click.prompt("Administrator name")
        password_input = click.prompt(
            "Administrator password",
            hide_input=True,
            confirmation_prompt=True,
        )

        try:
            email = normalize_email(email_input)
            name = validate_name(name)
            password = validate_password(password_input)
        except InputValidationError as exc:
            raise click.ClickException(str(exc)) from exc

        database = current_app.extensions["mongo_client"][
            current_app.config["MONGODB_DATABASE"]
        ]
        try:
            ensure_user_indexes(database)
            if database.users.find_one({"role": "admin"}, {"_id": 1}):
                raise click.ClickException(
                    "An administrator already exists; initial setup cannot run again."
                )
            user = create_user(
                database,
                name,
                email,
                password,
                role="admin",
            )
        except DuplicateKeyError as exc:
            raise click.ClickException(
                "An administrator or account with this email already exists."
            ) from exc
        except PyMongoError as exc:
            current_app.logger.exception("Administrator bootstrap failed.")
            raise click.ClickException(
                "Could not reach MongoDB or create the administrator."
            ) from exc

        click.echo(f"Initial administrator created for {user['email']}.")
