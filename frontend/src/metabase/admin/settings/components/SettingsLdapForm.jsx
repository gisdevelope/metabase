import React, { Component, PropTypes } from "react";
import cx from "classnames";
import _ from "underscore";

import MetabaseUtils from "metabase/lib/utils";
import SettingsSetting from "./SettingsSetting.jsx";

export default class SettingsLdapForm extends Component {

    constructor(props, context) {
        super(props, context);

        this.state = {
            dirty: false,
            formData: {},
            submitting: "default",
            valid: false,
            validationErrors: {}
        }
    }

    static propTypes = {
        elements: PropTypes.array.isRequired,
        formErrors: PropTypes.object,
        updateLdapSettings: PropTypes.func.isRequired
    };

    componentWillMount() {
        // this gives us an opportunity to load up our formData with any existing values for elements
        let formData = {};
        this.props.elements.forEach(function(element) {
            formData[element.key] = element.value;
        });

        this.setState({formData});
    }

    componentDidMount() {
        this.validateForm();
    }

    componentDidUpdate() {
        this.validateForm();
    }

    setSubmitting(submitting) {
        this.setState({submitting});
    }

    setFormErrors(formErrors) {
        this.setState({formErrors});
    }

    // return null if element passes validation, otherwise return an error message
    validateElement([validationType, validationMessage], value, element) {
        if (MetabaseUtils.isEmpty(value)) return;

        switch (validationType) {
            case "integer":
                return isNaN(parseInt(value)) ? (validationMessage || "That's not a valid integer") : null;
        }
    }

    validateForm() {
        let { elements } = this.props;
        let { formData } = this.state;

        let valid = true,
            validationErrors = {};

        elements.forEach(function(element) {
            // test for required elements
            if (element.required && MetabaseUtils.isEmpty(formData[element.key])) {
                valid = false;
            }

            if (element.validations) {
                element.validations.forEach(function(validation) {
                    validationErrors[element.key] = this.validateElement(validation, formData[element.key], element);
                    if (validationErrors[element.key]) valid = false;
                }, this);
            }
        }, this);

        if (this.state.valid !== valid || !_.isEqual(this.state.validationErrors, validationErrors)) {
            this.setState({ valid, validationErrors });
        }
    }

    handleChangeEvent(element, value, event) {
        this.setState({
            dirty: true,
            formData: { ...this.state.formData, [element.key]: (MetabaseUtils.isEmpty(value)) ? null : value }
        });
    }

    handleFormErrors(error) {
        // parse and format
        let formErrors = {};
        if (error.data && error.data.message) {
            formErrors.message = error.data.message;
        } else {
            formErrors.message = "Looks like we ran into some problems";
        }

        if (error.data && error.data.errors) {
            formErrors.elements = error.data.errors;
        }

        return formErrors;
    }

    updateLdapSettings(e) {
        e.preventDefault();

        this.setState({
            formErrors: null,
            submitting: "working"
        });

        let { formData, valid } = this.state;

        if (valid) {
            this.props.updateLdapSettings(formData).then(() => {
                this.setState({
                    dirty: false,
                    submitting: "success"
                });

                // show a confirmation for 3 seconds, then return to normal
                setTimeout(() => this.setState({ submitting: "default" }), 3000);
            }, (error) => {
                this.setState({
                    submitting: "default",
                    formErrors: this.handleFormErrors(error)
                });
            });
        }
    }

    render() {
        let { elements } = this.props;
        let { formData, formErrors, submitting, valid, validationErrors } = this.state;

        let settings = elements.map((element, index) => {
            // merge together data from a couple places to provide a complete view of the Element state
            let errorMessage = (formErrors && formErrors.elements) ? formErrors.elements[element.key] : validationErrors[element.key];
            let value = formData[element.key] == null ? element.defaultValue : formData[element.key];

            return (
                <SettingsSetting
                    key={element.key}
                    setting={{ ...element, value }}
                    updateSetting={this.handleChangeEvent.bind(this, element)}
                    errorMessage={errorMessage}
                />
            );
        });

        let saveSettingsButtonStates = {
            default: "Save changes",
            working: "Saving...",
            success: "Changes saved!"
        };

        let disabled = (!valid || submitting !== "default"),
            saveButtonText = saveSettingsButtonStates[submitting];

        return (
            <form noValidate>
                <ul>
                    {settings}
                    <li className="m2 mb4">
                        <button className={cx("Button mr2", {"Button--primary": !disabled}, {"Button--success-new": submitting === "success"})} disabled={disabled} onClick={this.updateLdapSettings.bind(this)}>
                            {saveButtonText}
                        </button>
                        { formErrors && formErrors.message ? <span className="pl2 text-error text-bold">{formErrors.message}</span> : null }
                    </li>
                </ul>
            </form>
        );
    }
}
