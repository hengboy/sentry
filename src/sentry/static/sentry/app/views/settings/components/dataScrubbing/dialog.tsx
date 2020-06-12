import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import styled from '@emotion/styled';
import omit from 'lodash/omit';

import Button from 'app/components/button';
import ButtonBar from 'app/components/buttonBar';
import {t} from 'app/locale';
import {defined} from 'app/utils';

import Form from './form/form';
<<<<<<< HEAD:src/sentry/static/sentry/app/views/settings/components/dataScrubbing/dialog.tsx
import {RuleType, MethodType} from './types';

const DEFAULT_RULE_SOURCE_VALUE = '';

type FormProps = React.ComponentProps<typeof Form>;
type Rule = FormProps['rule'];
type Errors = FormProps['errors'];
type Error = keyof Errors;

type Props = Pick<
  FormProps,
  'sourceSuggestions' | 'disabled' | 'eventId' | 'onUpdateEventId'
> & {
  rule?: Rule;
  onSaveRule: (rule: Rule) => Promise<{errors: Errors} | undefined>;
=======
import {RuleType, MethodType, EventId, SourceSuggestion, Rule, Errors} from './types';

const DEFAULT_RULE_SOURCE_VALUE = '';

type Props = {
>>>>>>> ref(pii): Updated save logic:src/sentry/static/sentry/app/views/settings/components/dataPrivacyRules/dialog.tsx
  onClose: () => void;
  onSaveRule: (rule: Rule) => void;
  onUpdateEventId?: (eventId: string) => void;
  sourceSuggestions?: Array<SourceSuggestion>;
  eventId?: EventId;
  rule?: Rule;
  disabled?: boolean;
};

type State = {
  rule: Rule;
  isFormValid: boolean;
  errors: Errors;
  isNewRule: boolean;
};

class Dialog extends React.Component<Props, State> {
  state: State = {
    rule: {
      id: defined(this.props.rule?.id) ? this.props.rule?.id! : -1,
      type: this.props.rule?.type || RuleType.CREDITCARD,
      method: this.props.rule?.method || MethodType.MASK,
      source: this.props.rule?.source || DEFAULT_RULE_SOURCE_VALUE,
      customRegex: this.props.rule?.customRegex,
    },
    isNewRule: defined(this.props.rule?.id),
    isFormValid: false,
    errors: {},
  };

  clearError = (error: keyof Errors) => {
    this.setState(prevState => ({
      errors: omit(prevState.errors, error),
    }));
  };

  handleChange = <T extends keyof Omit<Rule, 'id'>>(stateProperty: T, value: Rule[T]) => {
    const rule: Rule = {
      ...this.state.rule,
      [stateProperty]: value,
    };

    if (rule.type !== RuleType.PATTERN) {
      delete rule?.customRegex;
      this.clearError('customRegex');
    }

    if (stateProperty === 'customRegex' || stateProperty === 'source') {
      this.clearError(stateProperty as keyof Omit<Rule, 'id'>);
    }

    this.setState(
      {
        rule,
      },
      this.handleValidateForm
    );
  };

  handleValidation = <T extends keyof Errors>(field: T) => () => {
    const isFieldValueEmpty = !this.state.rule[field];
    const fieldErrorAlreadyExist = this.state.errors[field];

    if (isFieldValueEmpty && fieldErrorAlreadyExist) {
      return;
    }

    if (isFieldValueEmpty && !fieldErrorAlreadyExist) {
      this.setState(prevState => ({
        errors: {
          ...prevState.errors,
          [field]: t('Field Required'),
        },
      }));
      return;
    }

    if (!isFieldValueEmpty && fieldErrorAlreadyExist) {
      this.clearError(field);
    }
  };

  handleValidateForm = () => {
    const {rule} = this.state;

    const ruleKeys = Object.keys(omit(rule, 'id'));
    const isFormValid = !ruleKeys.find(ruleKey => !rule[ruleKey]);

    this.setState({
      isFormValid,
    });
  };

  handleSave = () => {
    const {rule} = this.state;
    const {onSaveRule, onClose} = this.props;

    onSaveRule(rule);
    onClose();
  };

  render() {
    const {onClose, disabled, sourceSuggestions, onUpdateEventId, eventId} = this.props;
    const {rule, isFormValid, errors, isNewRule} = this.state;

    return (
      <StyledModal show animation={false} onHide={() => {}}>
        <Modal.Header closeButton>
          {isNewRule ? t('Add a data privacy rule') : t('Edit a data privacy rule')}
        </Modal.Header>
        <Modal.Body>
          <Form
            onChange={this.handleChange}
            onValidate={this.handleValidation}
            sourceSuggestions={sourceSuggestions}
            rule={rule}
            disabled={disabled}
            onUpdateEventId={onUpdateEventId}
            eventId={eventId}
            errors={errors}
          />
        </Modal.Body>
        <Modal.Footer>
          <ButtonBar gap={1.5}>
            <Button disabled={disabled} onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button
              disabled={disabled || !isFormValid}
              onClick={this.handleSave}
              priority="primary"
            >
              {t('Save Rule')}
            </Button>
          </ButtonBar>
        </Modal.Footer>
      </StyledModal>
    );
  }
}

export default Dialog;

const StyledModal = styled(Modal)`
  .modal-dialog {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) !important;
    margin: 0;
    @media (max-width: ${p => p.theme.breakpoints[0]}) {
      width: 100%;
    }
  }
  .close {
    outline: none;
  }
`;