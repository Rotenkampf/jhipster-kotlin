/**
 * Copyright 2013-2019 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const path = require('path');
const mkdirp = require('mkdirp');
const cleanup = require('generator-jhipster/generators/cleanup');
const constants = require('generator-jhipster/generators/generator-constants');
const baseServerFiles = require('generator-jhipster/generators/server/files').serverFiles;
const cheerio = require('cheerio');
const kotlinConstants = require('../generator-kotlin-constants');

/* Constants use throughout */
const INTERPOLATE_REGEX = constants.INTERPOLATE_REGEX;
const SERVER_MAIN_SRC_DIR = constants.SERVER_MAIN_SRC_DIR;
const SERVER_MAIN_KOTLIN_SRC_DIR = `${constants.MAIN_DIR}kotlin/`;
const SERVER_TEST_SRC_KOTLIN_DIR = `${constants.TEST_DIR}kotlin/`;
const SERVER_MAIN_RES_DIR = constants.SERVER_MAIN_RES_DIR;
const SERVER_TEST_SRC_DIR = constants.SERVER_TEST_SRC_DIR;
const SERVER_TEST_RES_DIR = constants.SERVER_TEST_RES_DIR;
const TEST_DIR = constants.TEST_DIR;

// TODO: Do a PR in the parent JHipster project to export and re-use here as well in order to have a single source of truth!!!
const shouldSkipUserManagement = generator =>
    generator.skipUserManagement && (generator.applicationType !== 'monolith' || generator.authenticationType !== 'oauth2');

/**
 * The default is to use a file path string. It implies use of the template method.
 * For any other config an object { file:.., method:.., template:.. } can be used
 */
const serverFiles = {
    ...baseServerFiles,
    serverBuild: [
        ...baseServerFiles.serverBuild,
        {
            condition: generator => generator.buildTool === 'gradle',
            templates: [{ file: 'gradle/kotlin.gradle', useBluePrint: true }]
        },
        {
            templates: [{ file: `${kotlinConstants.DETEKT_CONFIG_FILE}`, useBluePrint: true }]
        }
    ],
    serverResource: [
        {
            path: SERVER_MAIN_RES_DIR,
            templates: [
                {
                    file: 'banner.txt',
                    method: 'copy',
                    noEjs: true,
                    renameTo: () => 'banner.txt',
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.clientFramework === 'react',
            path: SERVER_MAIN_RES_DIR,
            templates: [
                {
                    file: 'banner-react.txt',
                    method: 'copy',
                    noEjs: true,
                    renameTo: () => 'banner.txt'
                }
            ]
        },
        {
            condition: generator => generator.clientFramework !== 'react',
            path: SERVER_MAIN_RES_DIR,
            templates: [{ file: 'banner.txt', method: 'copy', noEjs: true }]
        },
        {
            condition: generator => generator.devDatabaseType === 'h2Disk' || generator.devDatabaseType === 'h2Memory',
            path: SERVER_MAIN_RES_DIR,
            templates: [{ file: 'h2.server.properties', renameTo: () => '.h2.server.properties' }]
        },
        {
            condition: generator => !!generator.enableSwaggerCodegen,
            path: SERVER_MAIN_RES_DIR,
            templates: ['swagger/api.yml']
        },
        {
            path: SERVER_MAIN_RES_DIR,
            templates: [
                // Thymeleaf templates
                { file: 'templates/error.html', method: 'copy' },
                'logback-spring.xml',
                'config/application.yml',
                'config/application-dev.yml',
                'config/application-tls.yml',
                'config/application-prod.yml',
                'i18n/messages.properties'
            ]
        },
        {
            condition: generator => generator.databaseType === 'sql',
            path: SERVER_MAIN_RES_DIR,
            templates: [
                {
                    file: 'config/liquibase/changelog/initial_schema.xml',
                    renameTo: () => 'config/liquibase/changelog/00000000000000_initial_schema.xml',
                    options: { interpolate: INTERPOLATE_REGEX }
                },
                'config/liquibase/master.xml'
            ]
        },
        {
            condition: generator =>
                generator.databaseType === 'mongodb' &&
                (!generator.skipUserManagement || (generator.skipUserManagement && generator.authenticationType === 'oauth2')),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/dbmigrations/InitialSetupMigration.kt',
                    renameTo: generator => `${generator.javaDir}config/dbmigrations/InitialSetupMigration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'couchbase',
            path: SERVER_MAIN_RES_DIR,
            templates: ['config/couchmove/changelog/V0__create_indexes.n1ql']
        },
        {
            condition: generator =>
                generator.databaseType === 'couchbase' && (!generator.skipUserManagement || generator.authenticationType === 'oauth2'),
            path: SERVER_MAIN_RES_DIR,
            templates: [
                'config/couchmove/changelog/V0.1__initial_setup/ROLE_ADMIN.json',
                'config/couchmove/changelog/V0.1__initial_setup/ROLE_USER.json',
                'config/couchmove/changelog/V0.1__initial_setup/user__admin.json',
                'config/couchmove/changelog/V0.1__initial_setup/user__anonymoususer.json',
                'config/couchmove/changelog/V0.1__initial_setup/user__system.json',
                'config/couchmove/changelog/V0.1__initial_setup/user__user.json'
            ]
        },
        {
            condition: generator => generator.databaseType === 'cassandra',
            path: SERVER_MAIN_RES_DIR,
            templates: [
                'config/cql/create-keyspace-prod.cql',
                'config/cql/create-keyspace.cql',
                'config/cql/drop-keyspace.cql',
                { file: 'config/cql/changelog/README.md', method: 'copy' }
            ]
        },
        {
            condition: generator =>
                generator.databaseType === 'cassandra' &&
                generator.applicationType !== 'microservice' &&
                (!generator.skipUserManagement || generator.authenticationType === 'oauth2'),
            path: SERVER_MAIN_RES_DIR,
            templates: [
                { file: 'config/cql/changelog/create-tables.cql', renameTo: () => 'config/cql/changelog/00000000000000_create-tables.cql' },
                {
                    file: 'config/cql/changelog/insert_default_users.cql',
                    renameTo: () => 'config/cql/changelog/00000000000001_insert_default_users.cql'
                }
            ]
        }
    ],
    serverJavaAuthConfig: [
        {
            condition: generator =>
                generator.databaseType === 'sql' || generator.databaseType === 'mongodb' || generator.databaseType === 'couchbase',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/SpringSecurityAuditorAware.kt',
                    renameTo: generator => `${generator.javaDir}security/SpringSecurityAuditorAware.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/SecurityUtils.kt',
                    renameTo: generator => `${generator.javaDir}security/SecurityUtils.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/AuthoritiesConstants.kt',
                    renameTo: generator => `${generator.javaDir}security/AuthoritiesConstants.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/security/SecurityUtilsUnitTest.kt',
                    renameTo: generator => `${generator.testDir}security/SecurityUtilsUnitTest.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'jwt',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/jwt/TokenProvider.kt',
                    renameTo: generator => `${generator.javaDir}security/jwt/TokenProvider.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/jwt/JWTFilter.kt',
                    renameTo: generator => `${generator.javaDir}security/jwt/JWTFilter.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'jwt' && !generator.reactive,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/jwt/JWTConfigurer.kt',
                    renameTo: generator => `${generator.javaDir}security/jwt/JWTConfigurer.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.reactive && generator.applicationType !== 'uaa',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/SecurityConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/SecurityConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.reactive && generator.applicationType !== 'uaa',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/ReactiveSecurityConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/SecurityConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !shouldSkipUserManagement(generator) && generator.applicationType === 'uaa',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/UaaWebSecurityConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/UaaWebSecurityConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/UaaConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/UaaConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/UaaProperties.kt',
                    renameTo: generator => `${generator.javaDir}config/UaaProperties.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/IatTokenEnhancer.kt',
                    renameTo: generator => `${generator.javaDir}security/IatTokenEnhancer.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                !shouldSkipUserManagement(generator) && generator.authenticationType === 'session' && !generator.reactive,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/PersistentTokenRememberMeServices.kt',
                    renameTo: generator => `${generator.javaDir}security/PersistentTokenRememberMeServices.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/domain/PersistentToken.kt',
                    renameTo: generator => `${generator.javaDir}domain/PersistentToken.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/PersistentTokenRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/PersistentTokenRepository.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'oauth2',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/oauth2/AudienceValidator.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/AudienceValidator.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'oauth2',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/security/oauth2/AudienceValidatorTest.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/AudienceValidatorTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/TestSecurityConfiguration.kt',
                    renameTo: generator => `${generator.testDir}config/TestSecurityConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !shouldSkipUserManagement(generator) && generator.authenticationType !== 'oauth2',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/DomainUserDetailsService.kt',
                    renameTo: generator => `${generator.javaDir}security/DomainUserDetailsService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/UserNotActivatedException.kt',
                    renameTo: generator => `${generator.javaDir}security/UserNotActivatedException.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.applicationType !== 'microservice' && generator.authenticationType === 'jwt',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/vm/LoginVM.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/vm/LoginVM.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/UserJWTController.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/UserJWTController.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaGateway: [
        {
            condition: generator => generator.applicationType === 'gateway' && generator.serviceDiscoveryType,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/GatewayConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/GatewayConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/apidoc/GatewaySwaggerResourcesProvider.kt',
                    renameTo: generator => `${generator.javaDir}config/apidoc/GatewaySwaggerResourcesProvider.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/gateway/ratelimiting/RateLimitingFilter.kt',
                    renameTo: generator => `${generator.javaDir}gateway/ratelimiting/RateLimitingFilter.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/gateway/accesscontrol/AccessControlFilter.kt',
                    renameTo: generator => `${generator.javaDir}gateway/accesscontrol/AccessControlFilter.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/gateway/responserewriting/SwaggerBasePathRewritingFilter.kt',
                    renameTo: generator => `${generator.javaDir}gateway/responserewriting/SwaggerBasePathRewritingFilter.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/vm/RouteVM.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/vm/RouteVM.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/GatewayResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/GatewayResource.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.applicationType === 'gateway' && generator.authenticationType === 'jwt' && generator.serviceDiscoveryType,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/gateway/TokenRelayFilter.kt',
                    renameTo: generator => `${generator.javaDir}gateway/TokenRelayFilter.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.applicationType === 'gateway' && generator.authenticationType === 'uaa',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/AuthResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/AuthResource.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/filter/RefreshTokenFilter.kt',
                    renameTo: generator => `${generator.javaDir}web/filter/RefreshTokenFilter.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/filter/RefreshTokenFilterConfigurer.kt',
                    renameTo: generator => `${generator.javaDir}web/filter/RefreshTokenFilterConfigurer.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/oauth2/OAuth2AuthenticationConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/oauth2/OAuth2AuthenticationConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/CookieCollection.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/CookieCollection.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/CookiesHttpServletRequestWrapper.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/CookiesHttpServletRequestWrapper.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/CookieTokenExtractor.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/CookieTokenExtractor.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2AuthenticationService.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/OAuth2AuthenticationService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2CookieHelper.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/OAuth2CookieHelper.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2Cookies.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/OAuth2Cookies.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2TokenEndpointClient.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/OAuth2TokenEndpointClient.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2TokenEndpointClientAdapter.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/OAuth2TokenEndpointClientAdapter.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/UaaTokenEndpointClient.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/UaaTokenEndpointClient.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.authenticationType === 'oauth2' &&
                (generator.applicationType === 'monolith' || generator.applicationType === 'gateway'),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/LogoutResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/LogoutResource.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverMicroservice: [
        {
            condition: generator =>
                generator.authenticationType === 'uaa' &&
                (generator.applicationType === 'microservice' || generator.applicationType === 'gateway'),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/oauth2/OAuth2Properties.kt',
                    renameTo: generator => `${generator.javaDir}config/oauth2/OAuth2Properties.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/oauth2/OAuth2JwtAccessTokenConverter.kt',
                    renameTo: generator => `${generator.javaDir}config/oauth2/OAuth2JwtAccessTokenConverter.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2SignatureVerifierClient.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/OAuth2SignatureVerifierClient.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/UaaSignatureVerifierClient.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/UaaSignatureVerifierClient.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                !generator.reactive && generator.applicationType === 'microservice' && generator.authenticationType === 'uaa',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/FeignConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/FeignConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/AuthorizedFeignClient.kt',
                    renameTo: generator => `${generator.javaDir}client/AuthorizedFeignClient.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/OAuth2InterceptedFeignConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}client/OAuth2InterceptedFeignConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/AuthorizedUserFeignClient.kt',
                    renameTo: generator => `${generator.javaDir}client/AuthorizedUserFeignClient.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/OAuth2_UserFeignClientInterceptor.kt',
                    renameTo: generator => `${generator.javaDir}client/UserFeignClientInterceptor.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/OAuth2UserClientFeignConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}client/OAuth2UserClientFeignConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                !generator.reactive &&
                (generator.applicationType === 'microservice' || generator.applicationType === 'gateway') &&
                generator.authenticationType === 'jwt',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/FeignConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/FeignConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/JWT_UserFeignClientInterceptor.kt',
                    renameTo: generator => `${generator.javaDir}client/UserFeignClientInterceptor.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'oauth2' && generator.applicationType === 'gateway',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/oauth2/AuthorizationHeaderFilter.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/AuthorizationHeaderFilter.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.authenticationType === 'oauth2' &&
                (generator.applicationType === 'microservice' || generator.applicationType === 'gateway'),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/security/oauth2/AuthorizationHeaderUtil.kt',
                    renameTo: generator => `${generator.javaDir}security/oauth2/AuthorizationHeaderUtil.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/FeignConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/FeignConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/AuthorizedFeignClient.kt',
                    renameTo: generator => `${generator.javaDir}client/AuthorizedFeignClient.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/OAuth2InterceptedFeignConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}client/OAuth2InterceptedFeignConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/client/TokenRelayRequestInterceptor.kt',
                    renameTo: generator => `${generator.javaDir}client/TokenRelayRequestInterceptor.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'oauth2',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/SecurityConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/SecurityConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                !(
                    generator.applicationType !== 'microservice' &&
                    !(
                        generator.applicationType === 'gateway' &&
                        (generator.authenticationType === 'uaa' || generator.authenticationType === 'oauth2')
                    )
                ) && generator.applicationType === 'microservice',
            path: SERVER_MAIN_RES_DIR,
            templates: [{ file: 'static/microservices_index.html', method: 'copy', renameTo: () => 'static/index.html' }]
        }
    ],
    ...baseServerFiles.serverResource.serverMicroserviceAndGateway,
    serverJavaApp: [
        {
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/Application.kt',
                    renameTo: generator => `${generator.javaDir}${generator.mainClass}.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.reactive,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/ApplicationWebXml.kt',
                    renameTo: generator => `${generator.javaDir}ApplicationWebXml.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaConfig: [
        {
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/aop/logging/LoggingAspect.kt',
                    renameTo: generator => `${generator.javaDir}aop/logging/LoggingAspect.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/DefaultProfileUtil.kt',
                    renameTo: generator => `${generator.javaDir}config/DefaultProfileUtil.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/AsyncConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/AsyncConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/DateTimeFormatConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/DateTimeFormatConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/LoggingConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/LoggingConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/ApplicationProperties.kt',
                    renameTo: generator => `${generator.javaDir}config/ApplicationProperties.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/JacksonConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/JacksonConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/LocaleConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/LocaleConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/LoggingAspectConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/LoggingAspectConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/WebConfigurer.kt',
                    renameTo: generator => `${generator.javaDir}config/WebConfigurer.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement || ['sql', 'mongodb', 'couchbase'].includes(generator.databaseType),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/Constants.kt',
                    renameTo: generator => `${generator.javaDir}config/Constants.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            // TODO: remove when supported by spring-data
            condition: generator => generator.reactive,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/ReactivePageableHandlerMethodArgumentResolver.kt',
                    renameTo: generator => `${generator.javaDir}config/ReactivePageableHandlerMethodArgumentResolver.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/ReactiveSortHandlerMethodArgumentResolver.kt',
                    renameTo: generator => `${generator.javaDir}config/ReactiveSortHandlerMethodArgumentResolver.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                ['ehcache', 'hazelcast', 'infinispan', 'memcached'].includes(generator.cacheProvider) ||
                generator.applicationType === 'gateway',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/CacheConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/CacheConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.cacheProvider === 'infinispan',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/CacheFactoryConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/CacheFactoryConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.databaseType === 'sql' || generator.databaseType === 'mongodb' || generator.databaseType === 'couchbase',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/CloudDatabaseConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/CloudDatabaseConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/DatabaseConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/DatabaseConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/audit/AuditEventConverter.kt',
                    renameTo: generator => `${generator.javaDir}config/audit/AuditEventConverter.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'sql',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/LiquibaseConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/LiquibaseConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'couchbase',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/repository/N1qlCouchbaseRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/N1qlCouchbaseRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/CustomN1qlCouchbaseRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/CustomN1qlCouchbaseRepository.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.reactive && generator.databaseType === 'couchbase',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/repository/reactive/ReactiveN1qlCouchbaseRepository.kt',
                    renameTo: generator =>
                        `${generator.javaDir}repository/${generator.reactiveRepository}ReactiveN1qlCouchbaseRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/reactive/CustomReactiveN1qlCouchbaseRepository.kt',
                    renameTo: generator =>
                        `${generator.javaDir}repository/${generator.reactiveRepository}CustomReactiveN1qlCouchbaseRepository.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.websocket === 'spring-websocket',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/WebsocketConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/WebsocketConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/WebsocketSecurityConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/WebsocketSecurityConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'cassandra',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/metrics/JHipsterHealthIndicatorConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/metrics/JHipsterHealthIndicatorConfiguration.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/metrics/CassandraHealthIndicator.kt',
                    renameTo: generator => `${generator.javaDir}config/metrics/CassandraHealthIndicator.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'cassandra',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/cassandra/CassandraConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/cassandra/CassandraConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.searchEngine === 'elasticsearch',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/ElasticsearchConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/ElasticsearchConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.messageBroker === 'kafka',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/MessagingConfiguration.kt',
                    renameTo: generator => `${generator.javaDir}config/MessagingConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaDomain: [
        {
            condition: generator => ['sql', 'mongodb', 'couchbase'].includes(generator.databaseType),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/domain/AbstractAuditingEntity.kt',
                    renameTo: generator => `${generator.javaDir}domain/AbstractAuditingEntity.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/domain/PersistentAuditEvent.kt',
                    renameTo: generator => `${generator.javaDir}domain/PersistentAuditEvent.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaPackageInfo: [],
    serverJavaService: [
        {
            condition: generator => !generator.skipUserManagement,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/service/util/RandomUtil.kt',
                    renameTo: generator => `${generator.javaDir}service/util/RandomUtil.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaWebError: [
        {
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/errors/BadRequestAlertException.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/BadRequestAlertException.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/ErrorConstants.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/ErrorConstants.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/ExceptionTranslator.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/ExceptionTranslator.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/FieldErrorVM.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/FieldErrorVM.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/errors/EmailAlreadyUsedException.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/EmailAlreadyUsedException.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/EmailNotFoundException.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/EmailNotFoundException.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/InvalidPasswordException.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/InvalidPasswordException.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/LoginAlreadyUsedException.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/errors/LoginAlreadyUsedException.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaWeb: [
        {
            condition: generator => !generator.skipClient && !generator.reactive,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/ClientForwardController.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/ClientForwardController.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaWebsocket: [
        {
            condition: generator => generator.websocket === 'spring-websocket',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/websocket/ActivityService.kt',
                    renameTo: generator => `${generator.javaDir}web/websocket/ActivityService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/websocket/dto/ActivityDTO.kt',
                    renameTo: generator => `${generator.javaDir}web/websocket/dto/ActivityDTO.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverTestFw: [
        {
            condition: generator => generator.databaseType === 'cassandra',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/CassandraKeyspaceIT.kt',
                    renameTo: generator => `${generator.testDir}CassandraKeyspaceIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/AbstractCassandraTest.kt',
                    renameTo: generator => `${generator.testDir}AbstractCassandraTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/CassandraConfigurationIT.kt',
                    renameTo: generator => `${generator.testDir}config/CassandraConfigurationIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'couchbase',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/config/DatabaseConfigurationIT.kt',
                    renameTo: generator => `${generator.testDir}config/DatabaseConfigurationIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/web/rest/TestUtil.kt',
                    renameTo: generator => `${generator.testDir}web/rest/TestUtil.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/ExceptionTranslatorIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/errors/ExceptionTranslatorIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/errors/ExceptionTranslatorTestController.kt',
                    renameTo: generator => `${generator.testDir}web/rest/errors/ExceptionTranslatorTestController.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipClient && !generator.reactive,
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/web/rest/ClientForwardControllerIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/ClientForwardControllerIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.databaseType === 'sql',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/config/timezone/HibernateTimeZoneIT.kt',
                    renameTo: generator => `${generator.testDir}config/timezone/HibernateTimeZoneIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/timezone/DateTimeWrapper.kt',
                    renameTo: generator => `${generator.testDir}repository/timezone/DateTimeWrapper.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/timezone/DateTimeWrapperRepository.kt',
                    renameTo: generator => `${generator.testDir}repository/timezone/DateTimeWrapperRepository.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            path: SERVER_TEST_RES_DIR,
            templates: ['config/application.yml', 'logback.xml']
        },
        {
            // TODO : add these tests to reactive
            condition: generator => !generator.reactive,
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/config/WebConfigurerTest.kt',
                    renameTo: generator => `${generator.testDir}config/WebConfigurerTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/WebConfigurerTestController.kt',
                    renameTo: generator => `${generator.testDir}config/WebConfigurerTestController.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.applicationType === 'gateway' && generator.serviceDiscoveryType,
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                // Create Gateway tests files
                {
                    file: 'package/gateway/responserewriting/SwaggerBasePathRewritingFilterTest.kt',
                    renameTo: generator => `${generator.testDir}gateway/responserewriting/SwaggerBasePathRewritingFilterTest.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.serviceDiscoveryType,
            path: SERVER_TEST_RES_DIR,
            templates: ['config/bootstrap.yml']
        },
        {
            condition: generator => generator.authenticationType === 'uaa',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/security/OAuth2TokenMockUtil.kt',
                    renameTo: generator => `${generator.testDir}security/OAuth2TokenMockUtil.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/config/SecurityBeanOverrideConfiguration.kt',
                    renameTo: generator => `${generator.testDir}config/SecurityBeanOverrideConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'uaa' && generator.applicationType === 'gateway',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/security/oauth2/OAuth2CookieHelperTest.kt',
                    renameTo: generator => `${generator.testDir}security/oauth2/OAuth2CookieHelperTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/OAuth2AuthenticationServiceTest.kt',
                    renameTo: generator => `${generator.testDir}security/oauth2/OAuth2AuthenticationServiceTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/CookieTokenExtractorTest.kt',
                    renameTo: generator => `${generator.testDir}security/oauth2/CookieTokenExtractorTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/oauth2/CookieCollectionTest.kt',
                    renameTo: generator => `${generator.testDir}security/oauth2/CookieCollectionTest.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.authenticationType === 'oauth2' &&
                (generator.applicationType === 'monolith' || generator.applicationType === 'gateway'),
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/web/rest/LogoutResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/LogoutResourceIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => {
                if (generator.gatlingTests) {
                    mkdirp(`${TEST_DIR}gatling/user-files/data`);
                    mkdirp(`${TEST_DIR}gatling/user-files/bodies`);
                    mkdirp(`${TEST_DIR}gatling/user-files/simulations`);
                    return true;
                }
                return false;
            },
            path: TEST_DIR,
            templates: [
                // Create Gatling test files
                'gatling/conf/gatling.conf',
                'gatling/conf/logback.xml'
            ]
        },
        {
            condition: generator => generator.cucumberTests,
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                // Create Cucumber test files
                {
                    file: 'package/cucumber/CucumberIT.kt',
                    renameTo: generator => `${generator.testDir}cucumber/CucumberIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/cucumber/stepdefs/StepDefs.kt',
                    useBluePrint: true,
                    renameTo: generator => `${generator.testDir}cucumber/stepdefs/StepDefs.kt`
                },
                {
                    file: 'package/cucumber/CucumberContextConfiguration.kt',
                    renameTo: generator => `${generator.testDir}cucumber/CucumberContextConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.cucumberTests,
            path: SERVER_TEST_SRC_DIR,
            templates: [{ file: '../features/gitkeep', noEjs: true }]
        },
        {
            condition: generator => !shouldSkipUserManagement(generator) && generator.authenticationType !== 'oauth2',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                // Create auth config test files
                {
                    file: 'package/security/DomainUserDetailsServiceIT.kt',
                    renameTo: generator => `${generator.testDir}security/DomainUserDetailsServiceIT.kt`,
                    useBluePrint: true
                }
            ]
        }
    ],
    serverJavaUserManagement: [
        {
            condition: generator =>
                (generator.skipUserManagement &&
                    generator.authenticationType === 'oauth2' &&
                    generator.applicationType !== 'microservice') ||
                (!generator.skipUserManagement && generator.databaseType === 'sql'),
            path: SERVER_MAIN_RES_DIR,
            templates: ['config/liquibase/data/user.csv']
        },
        {
            condition: generator =>
                (generator.skipUserManagement &&
                    generator.authenticationType === 'oauth2' &&
                    generator.applicationType !== 'microservice' &&
                    generator.databaseType === 'sql') ||
                (!generator.skipUserManagement && generator.databaseType === 'sql'),
            path: SERVER_MAIN_RES_DIR,
            templates: ['config/liquibase/data/authority.csv', 'config/liquibase/data/user_authority.csv']
        },
        {
            condition: generator => generator.skipUserManagement && generator.authenticationType === 'oauth2',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/config/Constants.kt',
                    renameTo: generator => `${generator.javaDir}config/Constants.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/domain/User.kt',
                    renameTo: generator => `${generator.javaDir}domain/${generator.asEntity('User')}.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/domain/Authority.kt',
                    renameTo: generator => `${generator.javaDir}domain/Authority.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/UserService.kt',
                    renameTo: generator => `${generator.javaDir}service/UserService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/dto/UserDTO.kt',
                    renameTo: generator => `${generator.javaDir}service/dto/${generator.asDto('User')}.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/mapper/UserMapper.kt',
                    renameTo: generator => `${generator.javaDir}service/mapper/UserMapper.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/UserRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/UserRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/AuthorityRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/AuthorityRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/UserResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/UserResource.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/vm/ManagedUserVM.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/vm/ManagedUserVM.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.skipUserManagement &&
                generator.authenticationType !== 'uaa' &&
                ['monolith', 'gateway'].includes(generator.applicationType),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/web/rest/AccountResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/AccountResource.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.skipUserManagement && generator.authenticationType === 'oauth2',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/service/UserServiceIT.kt',
                    renameTo: generator => `${generator.testDir}service/UserServiceIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/mapper/UserMapperIT.kt',
                    renameTo: generator => `${generator.testDir}service/mapper/UserMapperIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/UserResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/UserResourceIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.skipUserManagement &&
                generator.authenticationType !== 'uaa' &&
                ['monolith', 'gateway'].includes(generator.applicationType),
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/web/rest/AccountResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/AccountResourceIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.skipUserManagement && generator.authenticationType === 'oauth2' && generator.searchEngine === 'elasticsearch',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/repository/search/UserSearchRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/search/UserSearchRepository.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.skipUserManagement && generator.authenticationType === 'oauth2' && generator.searchEngine === 'elasticsearch',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/repository/search/UserSearchRepositoryMockConfiguration.kt',
                    renameTo: generator => `${generator.testDir}repository/search/UserSearchRepositoryMockConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.skipUserManagement &&
                generator.authenticationType === 'oauth2' &&
                ['sql', 'mongodb'].includes(generator.databaseType),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/repository/CustomAuditEventRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/CustomAuditEventRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/AuthorityRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/AuthorityRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/PersistenceAuditEventRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/PersistenceAuditEventRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/AuditEventService.kt',
                    renameTo: generator => `${generator.javaDir}service/AuditEventService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/AuditResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/AuditResource.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator =>
                generator.skipUserManagement &&
                generator.authenticationType === 'oauth2' &&
                ['sql', 'mongodb'].includes(generator.databaseType),
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/repository/CustomAuditEventRepositoryIT.kt',
                    renameTo: generator => `${generator.testDir}repository/CustomAuditEventRepositoryIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/AuditResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/AuditResourceIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement,
            path: SERVER_MAIN_RES_DIR,
            templates: [
                'templates/mail/activationEmail.html',
                'templates/mail/creationEmail.html',
                'templates/mail/passwordResetEmail.html'
            ]
        },
        {
            condition: generator => !generator.skipUserManagement && ['sql', 'mongodb', 'couchbase'].includes(generator.databaseType),
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/domain/Authority.kt',
                    renameTo: generator => `${generator.javaDir}domain/Authority.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/CustomAuditEventRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/CustomAuditEventRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/AuthorityRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/${generator.reactiveRepository}AuthorityRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/PersistenceAuditEventRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/PersistenceAuditEventRepository.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/AuditEventService.kt',
                    renameTo: generator => `${generator.javaDir}service/AuditEventService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/AuditResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/AuditResource.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement,
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                /* User management java domain files */
                {
                    file: 'package/domain/User.kt',
                    renameTo: generator => `${generator.javaDir}domain/${generator.asEntity('User')}.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/repository/UserRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/${generator.reactiveRepository}UserRepository.kt`,
                    useBluePrint: true
                },

                /* User management java service files */
                {
                    file: 'package/service/UserService.kt',
                    renameTo: generator => `${generator.javaDir}service/UserService.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/MailService.kt',
                    renameTo: generator => `${generator.javaDir}service/MailService.kt`,
                    useBluePrint: true
                },

                /* User management java web files */
                {
                    file: 'package/service/dto/UserDTO.kt',
                    renameTo: generator => `${generator.javaDir}service/dto/${generator.asDto('User')}.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/dto/PasswordChangeDTO.kt',
                    renameTo: generator => `${generator.javaDir}service/dto/PasswordChangeDTO.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/vm/ManagedUserVM.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/vm/ManagedUserVM.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/AccountResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/AccountResource.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/UserResource.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/UserResource.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/vm/KeyAndPasswordVM.kt',
                    renameTo: generator => `${generator.javaDir}web/rest/vm/KeyAndPasswordVM.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/mapper/UserMapper.kt',
                    renameTo: generator => `${generator.javaDir}service/mapper/UserMapper.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement && generator.searchEngine === 'elasticsearch',
            path: SERVER_MAIN_KOTLIN_SRC_DIR,
            templates: [
                {
                    file: 'package/repository/search/UserSearchRepository.kt',
                    renameTo: generator => `${generator.javaDir}repository/search/UserSearchRepository.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement && generator.searchEngine === 'elasticsearch',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/repository/search/UserSearchRepositoryMockConfiguration.kt',
                    renameTo: generator => `${generator.testDir}repository/search/UserSearchRepositoryMockConfiguration.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.authenticationType === 'jwt',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/security/jwt/TokenProviderTest.kt',
                    renameTo: generator => `${generator.testDir}security/jwt/TokenProviderTest.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/security/jwt/JWTFilterTest.kt',
                    renameTo: generator => `${generator.testDir}security/jwt/JWTFilterTest.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => generator.applicationType !== 'microservice' && generator.authenticationType === 'jwt',
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/web/rest/UserJWTControllerIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/UserJWTControllerIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            // TODO : add tests for reactive
            condition: generator =>
                !generator.reactive && !generator.skipUserManagement && ['sql', 'mongodb', 'couchbase'].includes(generator.databaseType),
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/web/rest/AuditResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/AuditResourceIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement && ['sql', 'mongodb', 'couchbase'].includes(generator.databaseType),
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/repository/CustomAuditEventRepositoryIT.kt',
                    renameTo: generator => `${generator.testDir}repository/CustomAuditEventRepositoryIT.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement && generator.cucumberTests,
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/cucumber/stepdefs/UserStepDefs.kt',
                    renameTo: generator => `${generator.testDir}cucumber/stepdefs/UserStepDefs.kt`,
                    useBluePrint: true
                }
            ]
        },
        {
            condition: generator => !generator.skipUserManagement && generator.cucumberTests,
            path: SERVER_TEST_SRC_DIR,
            templates: ['../features/user/user.feature']
        },
        {
            condition: generator => !generator.skipUserManagement,
            path: SERVER_TEST_RES_DIR,
            templates: [
                /* User management java test files */
                'templates/mail/testEmail.html',
                'i18n/messages_en.properties'
            ]
        },
        {
            condition: generator => !generator.skipUserManagement,
            path: SERVER_TEST_SRC_KOTLIN_DIR,
            templates: [
                {
                    file: 'package/service/MailServiceIT.kt',
                    renameTo: generator => `${generator.testDir}service/MailServiceIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/UserServiceIT.kt',
                    renameTo: generator => `${generator.testDir}service/UserServiceIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/service/mapper/UserMapperIT.kt',
                    renameTo: generator => `${generator.testDir}service/mapper/UserMapperIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/AccountResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/AccountResourceIT.kt`,
                    useBluePrint: true
                },
                {
                    file: 'package/web/rest/UserResourceIT.kt',
                    renameTo: generator => `${generator.testDir}web/rest/UserResourceIT.kt`,
                    useBluePrint: true
                }
            ]
        }
    ]
};

/* eslint-disable no-template-curly-in-string */
function writeFiles() {
    return {
        setUp() {
            this.javaDir = `${this.packageFolder}/`;
            this.testDir = `${this.packageFolder}/`;

            // Create server resource files
            mkdirp(SERVER_MAIN_RES_DIR);
            mkdirp(`${SERVER_TEST_SRC_KOTLIN_DIR}/${this.testDir}`);
            this.generateKeyStore();
        },

        cleanupOldServerFiles() {
            cleanup.cleanupOldServerFiles(
                this,
                `${SERVER_MAIN_SRC_DIR}/${this.javaDir}`,
                `${SERVER_TEST_SRC_DIR}/${this.testDir}`,
                SERVER_MAIN_RES_DIR,
                SERVER_TEST_RES_DIR
            );
        },

        writeFiles() {
            writeFilesToDisk(serverFiles, this, false, this.fetchFromInstalledJHipster('server/templates'));
        },

        modifyFiles() {
            if (this.buildTool === 'gradle') {
                this.addGradleProperty('kotlin_version', kotlinConstants.KOTLIN_VERSION);
                this.addGradleProperty('detekt_version', kotlinConstants.DETEKT_VERSION);
                this.addGradlePlugin('org.jetbrains.kotlin', 'kotlin-gradle-plugin', '${kotlin_version}');
                this.addGradlePlugin('org.jetbrains.kotlin', 'kotlin-allopen', '${kotlin_version}');
                if (this.databaseType === 'sql') {
                    this.addGradlePlugin('org.jetbrains.kotlin', 'kotlin-noarg', '${kotlin_version}');
                }
                this.addGradlePlugin('org.jlleitschuh.gradle', 'ktlint-gradle', kotlinConstants.KTLINT_GRADLE_VERSION);
                this.addGradlePlugin('io.gitlab.arturbosch.detekt', 'detekt-gradle-plugin', '${detekt_version}');

                this.applyFromGradleScript('gradle/kotlin');
            }

            if (this.buildTool === 'maven') {
                this.addMavenPluginRepository('jcenter', 'https://jcenter.bintray.com/');

                this.addMavenProperty('kotlin.version', kotlinConstants.KOTLIN_VERSION);
                this.addMavenProperty('ktlint.version', kotlinConstants.KTLINT_VERSION);
                this.addMavenProperty('maven-antrun-plugin.version', kotlinConstants.MAVEN_ANTRUN_VERSION);
                this.addMavenProperty('detekt.version', kotlinConstants.DETEKT_VERSION);
                this.addMavenProperty('detekt.configFile', `$\{project.basedir}/${kotlinConstants.DETEKT_CONFIG_FILE}`);
                this.addMavenProperty('detekt.xmlReportFile', '${project.build.directory}/detekt-reports/detekt.xml');
                this.addMavenProperty('sonar.kotlin.detekt.reportPaths', '${detekt.xmlReportFile}');
                this.addMavenProperty('sonar.coverage.jacoco.xmlReportPaths', '${jacoco.reportFolder}/jacoco.xml');

                this.addMavenDependencyManagement('org.jetbrains.kotlin', 'kotlin-stdlib', '${kotlin.version}');
                this.addMavenDependencyManagement('org.jetbrains.kotlin', 'kotlin-stdlib-jdk7', '${kotlin.version}');
                this.addMavenDependency('com.fasterxml.jackson.datatype', 'jackson-datatype-json-org');
                this.addMavenDependency('org.jetbrains.kotlin', 'kotlin-stdlib-jdk8', '${kotlin.version}');
                this.addMavenDependency('org.jetbrains.kotlin', 'kotlin-reflect', '${kotlin.version}');
                this.addMavenDependency(
                    'org.jetbrains.kotlin',
                    'kotlin-test-junit',
                    '${kotlin.version}',
                    '            <scope>test</scope>'
                );
                this.addMavenDependency(
                    'com.nhaarman.mockitokotlin2',
                    'mockito-kotlin',
                    kotlinConstants.MOCKITO_KOTLIN_VERSION,
                    '            <scope>test</scope>'
                );
                // NOTE: Add proper indentation of the configuration tag
                const kotlinOther = `                <executions>
                    <execution>
                        <id>kapt</id>
                        <goals>
                            <goal>kapt</goal>
                        </goals>
                        <configuration>
                            <sourceDirs>
                                <sourceDir>$\{project.basedir}/src/main/kotlin</sourceDir>
                                <sourceDir>$\{project.basedir}/src/main/java</sourceDir>
                            </sourceDirs>
                            <annotationProcessorPaths>
                                <path>
                                    <groupId>org.mapstruct</groupId>
                                    <artifactId>mapstruct-processor</artifactId>
                                    <version>$\{mapstruct.version}</version>
                                </path>
                                ${
                                    this.databaseType === 'sql'
                                        ? `<!-- For JPA static metamodel generation -->
                                <path>
                                    <groupId>org.hibernate</groupId>
                                    <artifactId>hibernate-jpamodelgen</artifactId>
                                    <version>$\{hibernate.version}</version>
                                </path>${
                                    this.authenticationType !== 'uaa'
                                        ? `
                                <path>
                                    <groupId>org.glassfish.jaxb</groupId>
                                    <artifactId>jaxb-runtime</artifactId>
                                    <version>$\{jaxb-runtime.version}</version>
                                </path>`
                                        : ''
                                }`
                                        : ''
                                }
                            </annotationProcessorPaths>
                        </configuration>
                    </execution>
                    <execution>
                        <id>compile</id>
                        <phase>process-sources</phase>
                        <goals>
                            <goal>compile</goal>
                        </goals>
                        <configuration>
                            <sourceDirs>
                                <sourceDir>$\{project.basedir}/src/main/kotlin</sourceDir>
                                <sourceDir>$\{project.basedir}/src/main/java</sourceDir>
                            </sourceDirs>
                        </configuration>
                    </execution>
                    <execution>
                        <id>test-compile</id>
                        <phase>process-test-sources</phase>
                        <goals>
                            <goal>test-compile</goal>
                        </goals>
                        <configuration>
                            <sourceDirs>
                                <sourceDir>$\{project.basedir}/src/test/kotlin</sourceDir>
                                <sourceDir>$\{project.basedir}/src/test/java</sourceDir>
                            </sourceDirs>
                        </configuration>
                    </execution>
                </executions>
                <configuration>
                    <jvmTarget>$\{java.version}</jvmTarget>
                    <javaParameters>true</javaParameters>${
                        this.databaseType === 'couchbase'
                            ? `
                    <args>
                        <arg>-Xjvm-default=enable</arg>
                    </args>`
                            : ''
                    }
                    <compilerPlugins>
                        <plugin>spring</plugin>${
                            this.databaseType === 'sql'
                                ? `
                        <plugin>jpa</plugin>
                        <plugin>all-open</plugin>`
                                : ''
                        }
                    </compilerPlugins>${
                        this.databaseType === 'sql'
                            ? `<pluginOptions>
                        <!-- Each annotation is placed on its own line -->
                        <option>all-open:annotation=javax.persistence.Entity</option>
                        <option>all-open:annotation=javax.persistence.MappedSuperclass</option>
                        <option>all-open:annotation=javax.persistence.Embeddable</option>
                    </pluginOptions>`
                            : ''
                    }
                </configuration>
                <dependencies>
                    <dependency>
                        <groupId>org.jetbrains.kotlin</groupId>
                        <artifactId>kotlin-maven-allopen</artifactId>
                        <version>$\{kotlin.version}</version>
                    </dependency>
                    ${
                        this.databaseType === 'sql'
                            ? `<dependency>
                        <groupId>org.jetbrains.kotlin</groupId>
                        <artifactId>kotlin-maven-noarg</artifactId>
                        <version>$\{kotlin.version}</version>
                    </dependency>`
                            : ''
                    }
                </dependencies>`;
                this.addMavenPlugin('org.jetbrains.kotlin', 'kotlin-maven-plugin', '${kotlin.version}', kotlinOther);

                removeDefaultMavenCompilerPlugin(this);
                const defaultCompileOther = `                <executions>
                    <!-- Replacing default-compile as it is treated specially by maven -->
                    <execution>
                        <id>default-compile</id>
                        <phase>none</phase>
                    </execution>
                    <!-- Replacing default-testCompile as it is treated specially by maven -->
                    <execution>
                        <id>default-testCompile</id>
                        <phase>none</phase>
                    </execution>
                    <execution>
                        <id>java-compile</id>
                        <phase>compile</phase>
                        <goals>
                            <goal>compile</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>java-test-compile</id>
                        <phase>test-compile</phase>
                        <goals>
                            <goal>testCompile</goal>
                        </goals>
                    </execution>
                </executions>
                <configuration>
                    <proc>none</proc>
                </configuration>`;
                this.addMavenPlugin(
                    'org.apache.maven.plugins',
                    'maven-compiler-plugin',
                    '${maven-compiler-plugin.version}',
                    defaultCompileOther
                );

                const antRunOther = `                <executions>
                    <execution>
                        <id>ktlint-format</id>
                        <phase>validate</phase>
                        <configuration>
                            <target name="ktlint">
                                <java taskname="ktlint" dir="$\{basedir}" fork="true" failonerror="false"
                                      classpathref="maven.plugin.classpath" classname="com.github.shyiko.ktlint.Main">
                                    <arg value="-F"/>
                                    <arg value="src/**/*.kt"/>
                                </java>
                            </target>
                        </configuration>
                        <goals>
                            <goal>run</goal>
                        </goals>
                    </execution>
                    <execution>
                        <id>ktlint</id>
                        <configuration>
                            <target name="ktlint">
                                <java taskname="ktlint" dir="$\{basedir}" fork="true" failonerror="false"
                                      classpathref="maven.plugin.classpath" classname="com.github.shyiko.ktlint.Main">
                                    <arg value="src/**/*.kt"/>
                                    <!-- to generate report in checkstyle format prepend following args: -->
                                    <!--<arg value="&#45;&#45;reporter=plain"/>-->
                                    <!--<arg value="&#45;&#45;reporter=checkstyle,output=$\{project.build.directory}/ktlint.xml"/>-->
                                    <!-- see https://github.com/shyiko/ktlint#usage for more -->
                                </java>
                            </target>
                        </configuration>
                        <goals>
                            <goal>run</goal>
                        </goals>
                    </execution>
                    <execution>
                        <!-- This can be run separately with mvn antrun:run@detekt -->
                        <id>detekt</id>
                        <phase>verify</phase>
                        <configuration>
                            <target name="detekt">
                                <!-- See https://arturbosch.github.io/detekt/cli.html for more options-->
                                <java taskname="detekt" dir="$\{basedir}"
                                      fork="true"
                                      failonerror="true"
                                      classname="io.gitlab.arturbosch.detekt.cli.Main"
                                      classpathref="maven.plugin.classpath">
                                    <arg value="--input"/>
                                    <arg value="$\{project.basedir}/src/main/kotlin"/>
                                    <arg value="--report"/>
                                    <arg value="xml:$\{detekt.xmlReportFile}"/>
                                    <arg value="--config"/>
                                    <arg value="$\{detekt.configFile}"/>
                                </java>
                            </target>
                        </configuration>
                        <goals>
                            <goal>run</goal>
                        </goals>
                    </execution>
                </executions>
                <dependencies>
                    <dependency>
                        <groupId>com.github.shyiko</groupId>
                        <artifactId>ktlint</artifactId>
                        <version>$\{ktlint.version}</version>
                    </dependency>
                    <dependency>
                        <groupId>io.gitlab.arturbosch.detekt</groupId>
                        <artifactId>detekt-cli</artifactId>
                        <version>$\{detekt.version}</version>
                    </dependency>
                    <!-- additional 3rd party ruleset(s) can be specified here -->
                </dependencies>`;
                this.addMavenPlugin('org.apache.maven.plugins', 'maven-antrun-plugin', '${maven-antrun-plugin.version}', antRunOther);
            }
        }
    };
}

/**
 * write the given files using provided config.
 *
 * @param {object} files - files to write
 * @param {object} generator - the generator instance to use
 * @param {boolean} returnFiles - weather to return the generated file list or to write them
 * @param {string} prefix - prefix to add in the path
 */
function writeFilesToDisk(files, generator, returnFiles, prefix) {
    const _this = generator || this;
    const filesOut = [];
    const startTime = new Date();
    // using the fastest method for iterations
    for (let i = 0, blocks = Object.keys(files); i < blocks.length; i++) {
        for (let j = 0, blockTemplates = files[blocks[i]]; j < blockTemplates.length; j++) {
            const blockTemplate = blockTemplates[j];
            if (!blockTemplate.condition || blockTemplate.condition(_this)) {
                const path = blockTemplate.path || '';
                blockTemplate.templates.forEach(templateObj => {
                    let templatePath = path;
                    let method = 'template';
                    let useTemplate = false;
                    let options = {};
                    let templatePathTo;
                    if (typeof templateObj === 'string') {
                        templatePath += templateObj;
                    } else {
                        if (typeof templateObj.file === 'string') {
                            templatePath += templateObj.file;
                        } else if (typeof templateObj.file === 'function') {
                            templatePath += templateObj.file(_this);
                        }
                        method = templateObj.method ? templateObj.method : method;
                        useTemplate = templateObj.template ? templateObj.template : useTemplate;
                        options = templateObj.options ? templateObj.options : options;
                    }
                    if (templateObj && templateObj.renameTo) {
                        templatePathTo = path + templateObj.renameTo(_this);
                    } else {
                        // remove the .ejs suffix
                        templatePathTo = templatePath.replace('.ejs', '');
                    }
                    filesOut.push(templatePathTo);
                    if (!returnFiles) {
                        let templatePathFrom = prefix ? `${prefix}/${templatePath}` : templatePath;

                        if (templateObj.useBluePrint) {
                            templatePathFrom = templatePath;
                        }
                        if (
                            !templateObj.noEjs &&
                            !templatePathFrom.endsWith('.png') &&
                            !templatePathFrom.endsWith('.jpg') &&
                            !templatePathFrom.endsWith('.gif') &&
                            !templatePathFrom.endsWith('.svg') &&
                            !templatePathFrom.endsWith('.ico')
                        ) {
                            templatePathFrom = `${templatePathFrom}.ejs`;
                        }
                        // if (method === 'template')
                        _this[method](templatePathFrom, templatePathTo, _this, options, useTemplate);
                    }
                });
            }
        }
    }
    _this.debug(`Time taken to write files: ${new Date() - startTime}ms`);
    return filesOut;
}

/**
 * remove the default <maven-compiler-plugin> configuration from pom.xml.
 */
function removeDefaultMavenCompilerPlugin(generator) {
    const _this = generator || this;

    const fullPath = path.join(process.cwd(), 'pom.xml');
    const artifactId = 'maven-compiler-plugin';

    const xml = _this.fs.read(fullPath).toString();

    const $ = cheerio.load(xml, { xmlMode: true });

    $(`build > plugins > plugin > artifactId:contains('${artifactId}')`)
        .parent()
        .remove();

    const modifiedXml = $.xml();

    _this.fs.write(fullPath, modifiedXml);
}

module.exports = {
    writeFiles,
    writeFilesToDisk,
    serverFiles
};
