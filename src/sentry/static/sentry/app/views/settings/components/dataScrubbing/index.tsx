import React from 'react';
import styled from '@emotion/styled';

import space from 'app/styles/space';
import {t, tct} from 'app/locale';
import {Panel, PanelAlert, PanelBody, PanelHeader} from 'app/components/panels';
import {Client} from 'app/api';
import {addErrorMessage, addSuccessMessage} from 'app/actionCreators/indicator';
import ExternalLink from 'app/components/links/externalLink';
import Button from 'app/components/button';
import {Organization, Project} from 'app/types';

import Dialog from './dialog';
import Content from './content';
import OrganizationRules from './organizationRules';
import {
  Rule,
  EventIdStatus,
  SourceSuggestion,
  Errors,
  EventId,
  RequestError,
} from './types';
import {sourceSuggestions} from './utils';
import convertRelayPiiConfig from './convertRelayPiiConfig';
import submitRules from './submitRules';
import handleError from './handleError';

const ADVANCED_DATASCRUBBING_LINK =
  'https://docs.sentry.io/data-management/advanced-datascrubbing/';

type Props = {
  endpoint: string;
  organization: Organization;
  projectId?: Project['id'];
  relayPiiConfig?: string;
  additionalContext?: React.ReactNode;
  disabled?: boolean;
};

type State = {
  rules: Array<Rule>;
  savedRules: Array<Rule>;
  sourceSuggestions: Array<SourceSuggestion>;
  eventId: EventId;
  orgRules: Array<Rule>;
  errors: Errors;
  showAddRuleModal?: boolean;
  isProjectLevel?: boolean;
  relayPiiConfig?: string;
};

class DataScrubbing extends React.Component<Props, State> {
  state: State = {
    rules: [],
    savedRules: [],
    relayPiiConfig: this.props.relayPiiConfig,
    sourceSuggestions: [],
    eventId: {
      value: '',
    },
    orgRules: [],
    errors: {},
    isProjectLevel: this.props.endpoint.includes('projects'),
  };

  componentDidMount() {
    this.loadRules();
    this.loadSourceSuggestions();
    this.loadOrganizationRules();
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.relayPiiConfig !== this.state.relayPiiConfig) {
      this.loadRules();
    }
  }

  componentWillUnmount() {
    this.api.clear();
  }

  api = new Client();

  loadOrganizationRules = () => {
    const {isProjectLevel} = this.state;
    const {organization} = this.props;

    if (isProjectLevel) {
      try {
        const convertedRules = convertRelayPiiConfig(organization.relayPiiConfig);
        this.setState({
          orgRules: convertedRules,
        });
      } catch {
        addErrorMessage(t('Unable to load organization rules'));
      }
    }
  };

  loadRules() {
    try {
      const convertedRules = convertRelayPiiConfig(this.state.relayPiiConfig);
      this.setState({
        rules: convertedRules,
        savedRules: convertedRules,
      });
    } catch {
      addErrorMessage(t('Unable to load project rules'));
    }
  }

  loadSourceSuggestions = async () => {
    const {organization, projectId} = this.props;
    const {eventId} = this.state;

    if (!eventId.value) {
      this.setState(prevState => ({
        sourceSuggestions,
        eventId: {
          ...prevState.eventId,
          status: undefined,
        },
      }));
      return;
    }

    this.setState(prevState => ({
      sourceSuggestions,
      eventId: {
        ...prevState.eventId,
        status: EventIdStatus.LOADING,
      },
    }));

    try {
      const query: {projectId?: string; eventId: string} = {eventId: eventId.value};
      if (projectId) {
        query.projectId = projectId;
      }
      const rawSuggestions = await this.api.requestPromise(
        `/organizations/${organization.slug}/data-scrubbing-selector-suggestions/`,
        {query}
      );
      const suggestions: Array<SourceSuggestion> = rawSuggestions.suggestions;

      if (suggestions && suggestions.length > 0) {
        this.setState(prevState => ({
          sourceSuggestions: suggestions,
          eventId: {
            ...prevState.eventId,
            status: EventIdStatus.LOADED,
          },
        }));
        return;
      }

      this.setState(prevState => ({
        sourceSuggestions,
        eventId: {
          ...prevState.eventId,
          status: EventIdStatus.NOT_FOUND,
        },
      }));
    } catch {
      this.setState(prevState => ({
        eventId: {
          ...prevState.eventId,
          status: EventIdStatus.ERROR,
        },
      }));
    }
  };

  convertRequestError = (error: ReturnType<typeof handleError>) => {
    switch (error.type) {
      case RequestError.InvalidSelector:
        this.setState(prevState => ({
          errors: {
            ...prevState.errors,
            source: error.message,
          },
        }));
        break;
      case RequestError.RegexParse:
        this.setState(prevState => ({
          errors: {
            ...prevState.errors,
            customRegex: error.message,
          },
        }));
        break;
      default:
        addErrorMessage(error.message);
    }
  };

  handleSave = async (rules: Array<Rule>, successMessage: string) => {
    const {endpoint} = this.props;
    try {
      const data = await submitRules(this.api, endpoint, rules);
      if (data?.relayPiiConfig) {
        const convertedRules = convertRelayPiiConfig(data.relayPiiConfig);
        this.setState({rules: convertedRules});
        addSuccessMessage(successMessage);
      }
    } catch (error) {
      this.convertRequestError(handleError(error));
    }
  };

  handleAddRule = (rule: Rule) => {
    const {rules} = this.state;
    const newRule = {...rule, id: rules.length};
    const updatedRules = [...rules, newRule];
    this.handleSave(updatedRules, t('Successfully added rule'));
  };

  handleUpdateRule = (updatedRule: Rule) => {
    console.log('rule', updatedRule);
    // const rules = this.state.rules.map(rule => {
    //   if (rule.id === updatedRule.id) {
    //     return updatedRule;
    //   }
    //   return rule;
    // });
    // return await this.handleSubmit(rules).then(result => {
    //   if (!result) {
    //     this.setState({
    //       rules,
    //     });
    //     return undefined;
    //   }
    //   return result;
    // });
  };

  handleDeleteRule = (rulesToBeDeleted: Array<Rule['id']>) => {
    const rules = this.state.rules.filter(rule => !rulesToBeDeleted.includes(rule.id));
    this.handleSave(rules, t('Successfully deleted rule'));
  };

  handleToggleAddRuleModal = (showAddRuleModal: boolean) => () => {
    this.setState({
      showAddRuleModal,
    });
  };

  handleUpdateEventId = (eventId: string) => {
    this.setState(
      {
        eventId: {
          value: eventId,
        },
      },
      this.loadSourceSuggestions
    );
  };

  render() {
    const {additionalContext, disabled} = this.props;
    const {
      rules,
      sourceSuggestions,
      showAddRuleModal,
      eventId,
      orgRules,
      isProjectLevel,
      errors,
    } = this.state;

    return (
      <React.Fragment>
        <Panel>
          <PanelHeader>
            <div>{t('Advanced Data Scrubbing')}</div>
          </PanelHeader>
          <PanelAlert type="info">
            {additionalContext}{' '}
            {`${t('The new rules will only apply to upcoming events. ')}`}{' '}
            {tct('For more details, see [linkToDocs].', {
              linkToDocs: (
                <ExternalLink href={ADVANCED_DATASCRUBBING_LINK}>
                  {t('full documentation on data scrubbing')}
                </ExternalLink>
              ),
            })}
          </PanelAlert>
          <PanelBody>
            {isProjectLevel && <OrganizationRules rules={orgRules} />}
            <Content
              rules={rules}
              onDeleteRule={this.handleDeleteRule}
              onUpdateRule={this.handleUpdateRule}
              onUpdateEventId={this.handleUpdateEventId}
              eventId={eventId}
              sourceSuggestions={sourceSuggestions}
              disabled={disabled}
            />
            <PanelAction>
              <Button href={ADVANCED_DATASCRUBBING_LINK} target="_blank">
                {t('Read the docs')}
              </Button>
              <Button
                disabled={disabled}
                onClick={this.handleToggleAddRuleModal(true)}
                priority="primary"
              >
                {t('Add Rule')}
              </Button>
            </PanelAction>
          </PanelBody>
        </Panel>
        {showAddRuleModal && (
          <Dialog
            sourceSuggestions={sourceSuggestions}
            onSaveRule={this.handleAddRule}
            onClose={this.handleToggleAddRuleModal(false)}
            onUpdateEventId={this.handleUpdateEventId}
            eventId={eventId}
          />
        )}
      </React.Fragment>
    );
  }
}

export default DataScrubbing;

const PanelAction = styled('div')`
  padding: ${space(1)} ${space(2)};
  position: relative;
  display: grid;
  grid-gap: ${space(1)};
  grid-template-columns: auto auto;
  justify-content: flex-end;
  border-top: 1px solid ${p => p.theme.borderDark};
`;